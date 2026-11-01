/*
 * Integration tests for db/migrate.mjs and the real migrations.
 *
 * Each test gets its own throw-away database (created and dropped here), so it
 * never touches your development data. It needs a PostgreSQL login that may
 * create databases: it uses TEST_ADMIN_DATABASE_URL, or DATABASE_URL.
 *
 *   npm run test:db
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readdirSync } from "node:fs";
import {
  cp,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import pg from "pg";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.join(HERE, "migrate.mjs");
const REAL_MIGRATIONS = path.join(HERE, "migrations");
// Read from the folder so adding a migration never breaks these tests.
const ALL_MIGRATIONS = readdirSync(REAL_MIGRATIONS)
  .filter((file) => file.endsWith(".up.sql"))
  .map((file) => file.replace(".up.sql", ""))
  .sort();
const LATEST_MIGRATION = ALL_MIGRATIONS[ALL_MIGRATIONS.length - 1];
const adminUrl =
  process.env.TEST_ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;

const withDatabase = (url, name) => {
  const next = new URL(url);
  next.pathname = `/${name}`;
  return next.toString();
};

let adminClient;
let canCreateDatabases = false;
const databases = [];
const tempDirs = [];

// Decided before the suites are defined, so they can be skipped cleanly.
if (adminUrl) {
  adminClient = new pg.Client({
    connectionString: withDatabase(adminUrl, "postgres"),
  });
  try {
    await adminClient.connect();
    const { rows } = await adminClient.query(
      "SELECT rolcreatedb OR rolsuper AS ok FROM pg_roles WHERE rolname = current_user",
    );
    canCreateDatabases = rows[0]?.ok === true;
  } catch {
    canCreateDatabases = false;
  }
}

after(async () => {
  for (const name of databases) {
    await adminClient
      ?.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
      .catch(() => {});
  }
  await adminClient?.end().catch(() => {});
  for (const dir of tempDirs) await rm(dir, { recursive: true, force: true });
});

/** A new empty database, plus a client for inspecting it. */
async function freshDatabase() {
  const name = `luzanika_mig_${randomBytes(4).toString("hex")}_test`;
  await adminClient.query(`CREATE DATABASE "${name}"`);
  databases.push(name);

  const url = withDatabase(adminUrl, name);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return {
    name,
    url,
    query: (sql, params) => client.query(sql, params),
    close: () => client.end(),
  };
}

async function copyOfMigrations() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "luzanika-migrations-"));
  tempDirs.push(dir);
  await cp(REAL_MIGRATIONS, dir, { recursive: true });
  return dir;
}

async function migrationsDirWith(files) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "luzanika-migrations-"));
  tempDirs.push(dir);
  for (const [name, sql] of Object.entries(files))
    await writeFile(path.join(dir, name), sql);
  return dir;
}

/** Runs the migration script as a separate process, like a deploy would. */
function run(args, { url, dir, env = {} }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [RUNNER, ...args], {
      env: {
        ...process.env,
        DATABASE_MIGRATION_URL: url,
        ...(dir ? { MIGRATIONS_DIR: dir } : {}),
        ...env,
      },
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("close", (code) => resolve({ code, output }));
  });
}

const tableExists = async (db, table) =>
  (
    await db.query("SELECT to_regclass($1) IS NOT NULL AS found", [
      `public.${table}`,
    ])
  ).rows[0].found;

const appliedNames = async (db) =>
  (await db.query("SELECT name FROM schema_migrations ORDER BY name")).rows.map(
    (r) => r.name,
  );

const skip = () =>
  canCreateDatabases
    ? false
    : "needs a PostgreSQL login that can create databases";

describe("migration runner", { skip: skip() }, () => {
  test("lists everything as pending on a new database", async () => {
    const db = await freshDatabase();
    try {
      const result = await run(["status"], { url: db.url });
      assert.equal(result.code, 0, result.output);
      assert.match(result.output, /pending 0001_extensions_and_helpers/);
      assert.match(
        result.output,
        new RegExp(`0 applied, ${ALL_MIGRATIONS.length} pending`),
      );
    } finally {
      await db.close();
    }
  });

  test("applies all migrations, and a second run changes nothing", async () => {
    const db = await freshDatabase();
    try {
      const first = await run(["up"], { url: db.url });
      assert.equal(first.code, 0, first.output);
      assert.match(first.output, new RegExp(`applied ${LATEST_MIGRATION}`));
      assert.deepEqual(await appliedNames(db), ALL_MIGRATIONS);
      assert.ok(await tableExists(db, "customers"));
      assert.ok(await tableExists(db, "customer_sessions"));
      assert.ok(await tableExists(db, "customer_tokens"));

      const second = await run(["up"], { url: db.url });
      assert.equal(second.code, 0, second.output);
      assert.match(second.output, /up to date/);
      assert.equal((await appliedNames(db)).length, ALL_MIGRATIONS.length);
    } finally {
      await db.close();
    }
  });

  test("never prints the database password", async () => {
    const password = new URL(adminUrl).password;
    if (!password) return;
    const db = await freshDatabase();
    try {
      const result = await run(["up"], { url: db.url });
      assert.ok(!result.output.includes(password));
      assert.ok(!result.output.includes(decodeURIComponent(password)));
    } finally {
      await db.close();
    }
  });

  test("reverts the latest migration and re-applies it", async () => {
    const db = await freshDatabase();
    try {
      await run(["up"], { url: db.url });

      const reverted = await run(["down"], { url: db.url });
      assert.equal(reverted.code, 0, reverted.output);
      assert.match(reverted.output, new RegExp(`reverted ${LATEST_MIGRATION}`));
      assert.equal((await appliedNames(db)).length, ALL_MIGRATIONS.length - 1);

      const rest = await run(
        ["down", "--steps", String(ALL_MIGRATIONS.length - 1)],
        { url: db.url },
      );
      assert.equal(rest.code, 0, rest.output);
      for (const table of [
        "customers",
        "customer_sessions",
        "customer_tokens",
        "addresses",
        "categories",
        "products",
        "product_variants",
        "inventory",
        "stock_movements",
        "home_features",
        "cart_items",
        "wishlist_items",
        "orders",
        "order_items",
        "order_status_history",
        "payments",
        "order_counters",
      ]) {
        assert.ok(!(await tableExists(db, table)), `${table} should be gone`);
      }
      assert.deepEqual(await appliedNames(db), []);

      const again = await run(["up"], { url: db.url });
      assert.equal(again.code, 0, again.output);
      assert.deepEqual(await appliedNames(db), ALL_MIGRATIONS);
      assert.ok(await tableExists(db, "customer_tokens"));
    } finally {
      await db.close();
    }
  });

  test("refuses to continue when an applied migration was edited", async () => {
    const db = await freshDatabase();
    const dir = await copyOfMigrations();
    try {
      await run(["up"], { url: db.url, dir });
      const file = path.join(dir, "0002_customers.up.sql");
      await writeFile(
        file,
        `${await readFile(file, "utf8")}\n-- sneaky edit\n`,
      );

      const result = await run(["status"], { url: db.url, dir });
      assert.equal(result.code, 1);
      assert.match(
        result.output,
        /0002_customers was changed after it was applied/,
      );
    } finally {
      await db.close();
    }
  });

  test("is not fooled by Windows line endings in a migration file", async () => {
    const db = await freshDatabase();
    const dir = await copyOfMigrations();
    try {
      await run(["up"], { url: db.url, dir });
      const file = path.join(dir, "0002_customers.up.sql");
      const text = await readFile(file, "utf8");
      await writeFile(file, text.replace(/\r?\n/g, "\r\n"));

      const result = await run(["status"], { url: db.url, dir });
      assert.equal(result.code, 0, result.output);
    } finally {
      await db.close();
    }
  });

  test("rolls a failing migration back completely", async () => {
    const db = await freshDatabase();
    const dir = await migrationsDirWith({
      "0001_first.up.sql": "CREATE TABLE first_table (id int);",
      "0001_first.down.sql": "DROP TABLE first_table;",
      "0002_broken.up.sql":
        "CREATE TABLE second_table (id int);\nSELECT 1 / 0;",
      "0002_broken.down.sql": "DROP TABLE second_table;",
    });
    try {
      const result = await run(["up"], { url: db.url, dir });
      assert.equal(result.code, 1);
      assert.match(
        result.output,
        /0002_broken \(up\) failed and was rolled back/,
      );
      assert.ok(await tableExists(db, "first_table"));
      assert.ok(!(await tableExists(db, "second_table")));
      assert.deepEqual(await appliedNames(db), ["0001_first"]);
    } finally {
      await db.close();
    }
  });

  test("two simultaneous runs apply each migration exactly once", async () => {
    const db = await freshDatabase();
    try {
      const [a, b] = await Promise.all([
        run(["up"], { url: db.url }),
        run(["up"], { url: db.url }),
      ]);
      assert.equal(a.code, 0, a.output);
      assert.equal(b.code, 0, b.output);
      const appliedLines = `${a.output}${b.output}`.match(/^applied /gm) ?? [];
      assert.equal(appliedLines.length, ALL_MIGRATIONS.length);
      assert.equal((await appliedNames(db)).length, ALL_MIGRATIONS.length);
    } finally {
      await db.close();
    }
  });

  test("refuses to roll back in production without --allow-production", async () => {
    const db = await freshDatabase();
    try {
      await run(["up"], { url: db.url });
      const refused = await run(["down"], {
        url: db.url,
        env: { NODE_ENV: "production" },
      });
      assert.equal(refused.code, 1);
      assert.match(refused.output, /Refusing to roll back in production/);
      assert.equal((await appliedNames(db)).length, ALL_MIGRATIONS.length);

      const allowed = await run(["down", "--allow-production"], {
        url: db.url,
        env: { NODE_ENV: "production" },
      });
      assert.equal(allowed.code, 0, allowed.output);
      assert.equal((await appliedNames(db)).length, ALL_MIGRATIONS.length - 1);
    } finally {
      await db.close();
    }
  });

  test("refuses a down migration that is marked irreversible", async () => {
    const db = await freshDatabase();
    const dir = await migrationsDirWith({
      "0001_one_way.up.sql": "CREATE TABLE one_way (id int);",
      "0001_one_way.down.sql": "-- migrate:irreversible\n",
    });
    try {
      await run(["up"], { url: db.url, dir });
      const result = await run(["down"], { url: db.url, dir });
      assert.equal(result.code, 1);
      assert.match(result.output, /marked irreversible/);
      assert.ok(await tableExists(db, "one_way"));
    } finally {
      await db.close();
    }
  });

  test("runs a no-transaction migration", async () => {
    const db = await freshDatabase();
    const dir = await migrationsDirWith({
      "0001_table.up.sql": "CREATE TABLE things (id int);",
      "0001_table.down.sql": "DROP TABLE things;",
      "0002_index.up.sql":
        "-- migrate:no-transaction\nCREATE INDEX CONCURRENTLY things_id_idx ON things (id);",
      "0002_index.down.sql":
        "-- migrate:no-transaction\nDROP INDEX CONCURRENTLY things_id_idx;",
    });
    try {
      const up = await run(["up"], { url: db.url, dir });
      assert.equal(up.code, 0, up.output);
      const down = await run(["down"], { url: db.url, dir });
      assert.equal(down.code, 0, down.output);
      assert.deepEqual(await appliedNames(db), ["0001_table"]);
    } finally {
      await db.close();
    }
  });

  test("rejects badly named, missing and misnumbered files", async () => {
    const db = await freshDatabase();
    try {
      const cases = [
        [
          {
            "add_things.up.sql": "SELECT 1;",
            "add_things.down.sql": "SELECT 1;",
          },
          /name must look like/,
        ],
        [{ "0001_a.up.sql": "SELECT 1;" }, /missing 0001_a.down.sql/],
        [
          {
            "0001_a.up.sql": "SELECT 1;",
            "0001_a.down.sql": "SELECT 1;",
            "0003_c.up.sql": "SELECT 1;",
            "0003_c.down.sql": "SELECT 1;",
          },
          /no gaps or duplicates/,
        ],
        [
          { "0001_a.up.sql": "  \n", "0001_a.down.sql": "SELECT 1;" },
          /is empty/,
        ],
        [{ "0001_a.sql": "SELECT 1;" }, /must end in \.up\.sql or \.down\.sql/],
      ];
      for (const [files, expected] of cases) {
        const dir = await migrationsDirWith(files);
        const result = await run(["status"], { url: db.url, dir });
        assert.equal(result.code, 1, result.output);
        assert.match(result.output, expected);
      }
    } finally {
      await db.close();
    }
  });

  test("create scaffolds the next numbered pair", async () => {
    const dir = await copyOfMigrations();
    const db = await freshDatabase();
    try {
      const result = await run(["create", "Add Phone!"], { url: db.url, dir });
      assert.equal(result.code, 0, result.output);
      const files = await readdir(dir);
      const next = String(ALL_MIGRATIONS.length + 1).padStart(4, "0");
      assert.ok(files.includes(`${next}_add_phone.up.sql`));
      assert.ok(files.includes(`${next}_add_phone.down.sql`));
    } finally {
      await db.close();
    }
  });

  test("--test only runs against a database whose name ends in _test", async () => {
    const result = await run(["status", "--test"], {
      url: withDatabase(adminUrl, "postgres"),
      env: { TEST_DATABASE_MIGRATION_URL: withDatabase(adminUrl, "postgres") },
    });
    assert.equal(result.code, 1);
    assert.match(result.output, /ends in _test/);
  });

  test("says clearly when the database cannot be reached", async () => {
    const bad = new URL(adminUrl);
    bad.port = "1";
    const result = await run(["status"], { url: bad.toString() });
    assert.equal(result.code, 1);
    assert.match(result.output, /Cannot connect to the database/);
  });
});

describe("the real migrations", { skip: skip() }, () => {
  let db;
  const insertCustomer = (overrides = {}) => {
    const row = {
      email: "ada@example.com",
      password_hash: "$argon2id$v=19$m=65536,t=3,p=4$abc$def",
      first_name: "Ada",
      last_name: "Khan",
      ...overrides,
    };
    return db.query(
      `INSERT INTO customers (${Object.keys(row).join(", ")})
       VALUES (${Object.keys(row)
         .map((_, i) => `$${i + 1}`)
         .join(", ")})
       RETURNING id`,
      Object.values(row),
    );
  };
  const rejects = (promise, code) =>
    assert.rejects(promise, (error) => error.code === code);

  before(async () => {
    if (!canCreateDatabases) return;
    db = await freshDatabase();
    const result = await run(["up"], { url: db.url });
    assert.equal(result.code, 0, result.output);
  });
  after(async () => {
    await db?.close();
  });

  test("customer emails are unique regardless of letter case", async () => {
    await insertCustomer({ email: "Unique@Example.com" });
    await rejects(insertCustomer({ email: "unique@example.COM" }), "23505");
  });

  test("customers reject invalid data", async () => {
    await rejects(insertCustomer({ email: "no-at-sign" }), "23514");
    await rejects(insertCustomer({ email: " padded@example.com " }), "23514");
    await rejects(
      insertCustomer({ email: "a@b.com", first_name: "  " }),
      "23514",
    );
    await rejects(
      insertCustomer({ email: "b@b.com", last_name: "x".repeat(51) }),
      "23514",
    );
    await rejects(
      insertCustomer({ email: "c@b.com", gender: "other" }),
      "23514",
    );
    await rejects(
      insertCustomer({ email: "d@b.com", language: "fr" }),
      "23514",
    );
    await rejects(
      insertCustomer({ email: "e@b.com", password_hash: "" }),
      "23514",
    );
    await rejects(
      insertCustomer({ email: "f@b.com", date_of_birth: "1800-01-01" }),
      "23514",
    );
    await rejects(
      insertCustomer({ email: "g@b.com", status: "deleted" }),
      "23514",
    );
    await rejects(
      insertCustomer({ email: "h@b.com", status: "anonymised" }),
      "23514",
    );
  });

  test("customers fall back to safe defaults", async () => {
    const { rows } = await db.query(
      "SELECT status, language, email_verified_at FROM customers WHERE id = $1",
      [(await insertCustomer({ email: "defaults@example.com" })).rows[0].id],
    );
    assert.deepEqual(rows[0], {
      status: "active",
      language: "en",
      email_verified_at: null,
    });
  });

  test("updated_at moves forward on every update", async () => {
    const { id } = (await insertCustomer({ email: "touch@example.com" }))
      .rows[0];
    const before = (
      await db.query("SELECT updated_at FROM customers WHERE id = $1", [id])
    ).rows[0];
    await db.query("SELECT pg_sleep(0.05)");
    await db.query(
      "UPDATE customers SET first_name = 'Changed' WHERE id = $1",
      [id],
    );
    const after = (
      await db.query("SELECT updated_at FROM customers WHERE id = $1", [id])
    ).rows[0];
    assert.ok(after.updated_at > before.updated_at);
  });

  test("sessions are validated and removed with their customer", async () => {
    const { id } = (await insertCustomer({ email: "session@example.com" }))
      .rows[0];
    const hash = "a".repeat(64);
    const insertSession = (tokenHash, expires = "now() + interval '1 day'") =>
      db.query(
        `INSERT INTO customer_sessions (customer_id, token_hash, expires_at) VALUES ($1, $2, ${expires})`,
        [id, tokenHash],
      );

    await insertSession(hash);
    await rejects(insertSession(hash), "23505");
    await rejects(insertSession("not-a-hash"), "23514");
    await rejects(insertSession("B".repeat(64)), "23514");
    await rejects(
      insertSession("c".repeat(64), "now() - interval '1 day'"),
      "23514",
    );
    await rejects(
      db.query(
        "INSERT INTO customer_sessions (customer_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 day')",
        [crypto.randomUUID(), "d".repeat(64)],
      ),
      "23503",
    );

    await db.query("DELETE FROM customers WHERE id = $1", [id]);
    const { rows } = await db.query(
      "SELECT count(*)::int AS n FROM customer_sessions WHERE customer_id = $1",
      [id],
    );
    assert.equal(rows[0].n, 0);
  });

  test("one-time links are validated and removed with their customer", async () => {
    const { id } = (await insertCustomer({ email: "links@example.com" }))
      .rows[0];
    const insertToken = (
      tokenHash,
      {
        type = "reset_password",
        expires = "now() + interval '30 minutes'",
      } = {},
    ) =>
      db.query(
        `INSERT INTO customer_tokens (customer_id, type, token_hash, expires_at) VALUES ($1, $2, $3, ${expires})`,
        [id, type, tokenHash],
      );

    await insertToken("e".repeat(64));
    await rejects(insertToken("e".repeat(64)), "23505");
    await rejects(insertToken("not-a-hash"), "23514");
    await rejects(insertToken("f".repeat(64), { type: "made_up" }), "23514");
    await rejects(
      insertToken("1".repeat(64), { expires: "now() - interval '1 day'" }),
      "23514",
    );
    await rejects(
      db.query(
        "INSERT INTO customer_tokens (customer_id, type, token_hash, expires_at) VALUES ($1, 'reset_password', $2, now() + interval '1 day')",
        [crypto.randomUUID(), "2".repeat(64)],
      ),
      "23503",
    );

    await db.query("DELETE FROM customers WHERE id = $1", [id]);
    const { rows } = await db.query(
      "SELECT count(*)::int AS n FROM customer_tokens WHERE customer_id = $1",
      [id],
    );
    assert.equal(rows[0].n, 0);
  });

  test("addresses: one default per customer, length limits, removed with the customer", async () => {
    const { id } = (await insertCustomer({ email: "addr1@example.com" }))
      .rows[0];
    const other = (await insertCustomer({ email: "addr2@example.com" })).rows[0]
      .id;
    const insert = (customerId, overrides = {}) => {
      const row = {
        customer_id: customerId,
        full_name: "Ada",
        phone: "+49 170 1234567",
        country: "Germany",
        city: "Berlin",
        address: "Street 1",
        zip: "10117",
        is_default: false,
        ...overrides,
      };
      return db.query(
        `INSERT INTO addresses (${Object.keys(row).join(", ")})
         VALUES (${Object.keys(row)
           .map((_, i) => `$${i + 1}`)
           .join(", ")})`,
        Object.values(row),
      );
    };

    await insert(id, { is_default: true });
    await insert(id); // any number of non-default addresses
    await insert(id);
    await rejects(insert(id, { is_default: true }), "23505");
    await insert(other, { is_default: true }); // another customer has their own default

    await rejects(insert(id, { full_name: "  " }), "23514");
    await rejects(insert(id, { full_name: "x".repeat(81) }), "23514");
    await rejects(insert(id, { phone: "123" }), "23514");
    await rejects(insert(id, { zip: "1".repeat(13) }), "23514");
    await rejects(insert(id, { address: "x".repeat(161) }), "23514");
    await rejects(insert(crypto.randomUUID()), "23503");

    await db.query("DELETE FROM customers WHERE id = $1", [id]);
    const { rows } = await db.query(
      "SELECT count(*)::int AS n FROM addresses WHERE customer_id = $1",
      [id],
    );
    assert.equal(rows[0].n, 0);
  });

  test("catalogue: prices, stock and variants cannot be stored in an invalid state", async () => {
    const q = (text, values) => db.query(text, values);
    const category = (
      await q(
        `INSERT INTO categories (slug, label, hero_title, title, description,
           hero_image_src, hero_image_alt, all_label, price_min, price_max, price_step)
         VALUES ('cat-a', 'A', 'A', 'A', 'A', '/a.jpg', 'a', 'ALL A', 100, 1000, 10)
         RETURNING id`,
      )
    ).rows[0].id;
    const otherCategory = (
      await q(
        `INSERT INTO categories (slug, label, hero_title, title, description,
           hero_image_src, hero_image_alt, all_label, price_min, price_max, price_step)
         VALUES ('cat-b', 'B', 'B', 'B', 'B', '/b.jpg', 'b', 'ALL B', 100, 1000, 10)
         RETURNING id`,
      )
    ).rows[0].id;
    const sub = (
      await q(
        "INSERT INTO subcategories (category_id, slug, label) VALUES ($1, 'sub', 'SUB') RETURNING id",
        [category],
      )
    ).rows[0].id;
    const product = async (slug, overrides = {}) => {
      const row = { slug, name: "Item", ...overrides };
      return (
        await q(
          `INSERT INTO products (${Object.keys(row).join(", ")})
           VALUES (${Object.keys(row)
             .map((_, i) => `$${i + 1}`)
             .join(", ")}) RETURNING id`,
          Object.values(row),
        )
      ).rows[0].id;
    };

    await rejects(
      q(
        `INSERT INTO categories (slug, label, hero_title, title, description,
           hero_image_src, hero_image_alt, all_label, price_min, price_max, price_step)
         VALUES ('bad', 'B', 'B', 'B', 'B', '/b.jpg', 'b', 'ALL', 500, 100, 10)`,
      ),
      "23514",
    );

    const id = await product("item-one", { category_id: category });
    await rejects(product("item-one"), "23505");
    await rejects(product("Bad Slug"), "23514");
    await rejects(product("item-x", { status: "live" }), "23514");
    await rejects(product("item-x", { availability: "maybe" }), "23514");
    await rejects(product("item-x", { badge_label: "NEW" }), "23514"); // a badge needs its tone too
    await rejects(product("item-x", { rating_avg: 5.5 }), "23514");

    // A subcategory must belong to the product's own category, and needs a category at all.
    await product("item-sub", { category_id: category, subcategory_id: sub });
    await rejects(
      product("item-cross", {
        category_id: otherCategory,
        subcategory_id: sub,
      }),
      "23503",
    );
    await rejects(product("item-orphan", { subcategory_id: sub }), "23514");

    // Prices: one per market, in that market's currency, never negative.
    const price = (market, currency, amount, compareAt = null) =>
      q(
        `INSERT INTO product_prices (product_id, market, currency, amount, compare_at_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, market, currency, amount, compareAt],
      );
    await price("PK", "PKR", 85000);
    await price("DE", "EUR", 8500, 9900);
    await rejects(price("PK", "PKR", 1), "23505");
    await rejects(price("DE", "PKR", 100), "23514");
    await rejects(price("PK", "EUR", 100), "23514");
    await rejects(price("FR", "EUR", 100), "23514");
    const other = await product("item-two");
    await rejects(
      q(
        "INSERT INTO product_prices (product_id, market, currency, amount) VALUES ($1, 'PK', 'PKR', -1)",
        [other],
      ),
      "23514",
    );
    await rejects(
      q(
        "INSERT INTO product_prices (product_id, market, currency, amount, compare_at_amount) VALUES ($1, 'PK', 'PKR', 500, 500)",
        [other],
      ),
      "23514",
    ); // a "was" price must be higher

    // Variants: no duplicate colour/size combination (NULL counts as "none"), valid colour.
    const variant = (sku, color, hex, size) =>
      q(
        `INSERT INTO product_variants (product_id, sku, color_name, color_hex, size_label)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [id, sku, color, hex, size],
      );
    const first = (await variant("SKU-1", "Black", "#252525", "M")).rows[0].id;
    await variant("SKU-2", "Black", "#252525", "L");
    await rejects(variant("SKU-3", "Black", "#252525", "M"), "23505");
    await rejects(variant("SKU-1", "Red", "#ff0000", "M"), "23505");
    await rejects(variant("SKU-4", "Red", "red", "M"), "23514");
    await rejects(variant("SKU-5", "Red", null, "M"), "23514");
    const plainOne = other;
    const plain = (sku) =>
      q("INSERT INTO product_variants (product_id, sku) VALUES ($1, $2)", [
        plainOne,
        sku,
      ]);
    await plain("PLAIN-1");
    await rejects(plain("PLAIN-2"), "23505");

    // Stock: never negative, never more reserved than on hand, one row per variant and market.
    const stock = (market, onHand, reserved = 0) =>
      q(
        "INSERT INTO inventory (variant_id, market, on_hand, reserved) VALUES ($1, $2, $3, $4)",
        [first, market, onHand, reserved],
      );
    await stock("PK", 25);
    await rejects(stock("PK", 5), "23505");
    await rejects(stock("DE", -1), "23514");
    await rejects(stock("DE", 2, 3), "23514");
    await rejects(stock("XX", 1), "23514");
    await rejects(
      q(
        "UPDATE inventory SET on_hand = 1, reserved = 2 WHERE variant_id = $1",
        [first],
      ),
      "23514",
    );

    await rejects(
      q(
        "INSERT INTO stock_movements (variant_id, market, delta, reason) VALUES ($1, 'PK', 0, 'adjustment')",
        [first],
      ),
      "23514",
    );
    await rejects(
      q(
        "INSERT INTO stock_movements (variant_id, market, delta, reason) VALUES ($1, 'PK', 5, 'gift')",
        [first],
      ),
      "23514",
    );
    await q(
      "INSERT INTO stock_movements (variant_id, market, delta, reason) VALUES ($1, 'PK', 25, 'initial_import')",
      [first],
    );
    // A product with stock history cannot be hard-deleted away from its ledger.
    await rejects(
      q("DELETE FROM product_variants WHERE id = $1", [first]),
      "23001",
    );

    // Home sections: a known section, and one product once per section.
    await q(
      "INSERT INTO home_features (section, product_id, sort) VALUES ('featured', $1, 0)",
      [other],
    );
    await rejects(
      q(
        "INSERT INTO home_features (section, product_id, sort) VALUES ('featured', $1, 1)",
        [other],
      ),
      "23505",
    );
    await rejects(
      q(
        "INSERT INTO home_features (section, product_id, sort) VALUES ('sale', $1, 0)",
        [id],
      ),
      "23514",
    );

    // Removing a product removes its prices, photos, variants and stock with it
    // (here the ledger entry blocks it, so clear that first as an admin purge would).
    await q("DELETE FROM stock_movements WHERE variant_id = $1", [first]);
    await q("DELETE FROM products WHERE id = $1", [id]);
    const { rows } = await q(
      "SELECT (SELECT count(*) FROM product_prices WHERE product_id = $1)::int AS prices, (SELECT count(*) FROM inventory WHERE variant_id = $2)::int AS stock",
      [id, first],
    );
    assert.deepEqual(rows[0], { prices: 0, stock: 0 });
  });

  test("cart and wishlist: one line per variant, sane quantities, removed with the customer or product", async () => {
    const q = (text, values) => db.query(text, values);
    const customer = (await insertCustomer({ email: "cart1@example.com" }))
      .rows[0].id;
    const other = (await insertCustomer({ email: "cart2@example.com" })).rows[0]
      .id;
    const product = (
      await q(
        "INSERT INTO products (slug, name) VALUES ('cart-item', 'Item') RETURNING id",
      )
    ).rows[0].id;
    const variant = (
      await q(
        "INSERT INTO product_variants (product_id, sku) VALUES ($1, 'CART-1') RETURNING id",
        [product],
      )
    ).rows[0].id;
    const line = (customerId, variantId, quantity) =>
      q(
        "INSERT INTO cart_items (customer_id, variant_id, quantity) VALUES ($1, $2, $3)",
        [customerId, variantId, quantity],
      );

    await line(customer, variant, 2);
    await line(other, variant, 1); // another customer has their own line for the same variant
    await rejects(line(customer, variant, 1), "23505");
    await rejects(line(other, variant, 0), "23514");
    await rejects(line(other, variant, 100), "23514");
    await rejects(line(crypto.randomUUID(), variant, 1), "23503");
    await rejects(line(customer, crypto.randomUUID(), 1), "23503");

    const wish = (customerId, productId) =>
      q(
        "INSERT INTO wishlist_items (customer_id, product_id) VALUES ($1, $2)",
        [customerId, productId],
      );
    await wish(customer, product);
    await wish(other, product);
    await rejects(wish(customer, product), "23505");
    await rejects(wish(customer, crypto.randomUUID()), "23503");

    await q("DELETE FROM customers WHERE id = $1", [customer]);
    const count = async (table, id) =>
      (
        await q(
          `SELECT count(*)::int AS n FROM ${table} WHERE customer_id = $1`,
          [id],
        )
      ).rows[0].n;
    assert.equal(await count("cart_items", customer), 0);
    assert.equal(await count("wishlist_items", customer), 0);
    assert.equal(await count("cart_items", other), 1);

    // A product that is purged takes its saved entries and cart lines with it.
    await q("DELETE FROM products WHERE id = $1", [product]);
    assert.equal(await count("cart_items", other), 0);
    assert.equal(await count("wishlist_items", other), 0);
  });

  test("orders: consistent amounts, status and stock state, snapshots that survive deletions", async () => {
    const q = (text, values) => db.query(text, values);
    const customer = (await insertCustomer({ email: "order1@example.com" }))
      .rows[0].id;
    const base = {
      number: "T-1",
      market: "PK",
      currency: "PKR",
      customer_id: customer,
      email: "a@example.com",
      phone: "+92 300 1234567",
      payment_method: "card",
      subtotal: 1000,
      total: 1000,
      ship_name: "Ada",
      ship_country: "Pakistan",
      ship_city: "Lahore",
      ship_address: "Street 1",
      ship_zip: "54000",
      accepted_terms_at: new Date(),
    };
    const order = async (overrides = {}) => {
      const row = { ...base, ...overrides };
      return (
        await q(
          `INSERT INTO orders (${Object.keys(row).join(", ")})
           VALUES (${Object.keys(row)
             .map((_, i) => `$${i + 1}`)
             .join(", ")}) RETURNING id`,
          Object.values(row),
        )
      ).rows[0].id;
    };

    const id = await order();
    await rejects(order(), "23505"); // the number is unique
    await rejects(
      order({ number: "T-2", market: "PK", currency: "EUR" }),
      "23514",
    );
    await rejects(
      order({ number: "T-2", market: "DE", currency: "PKR" }),
      "23514",
    );
    await rejects(order({ number: "T-2", total: 999 }), "23514"); // total must add up
    await rejects(order({ number: "T-2", subtotal: -1, total: -1 }), "23514");
    await rejects(order({ number: "T-2", payment_method: "cheque" }), "23514");
    await rejects(order({ number: "T-2", status: "shipped" }), "23514");
    await rejects(order({ number: "T-2", bill_country: "Germany" }), "23514"); // billing is all or nothing
    // Shipping and a discount keep the total honest; tax is only added when it is not included.
    await order({
      number: "T-3",
      subtotal: 1000,
      shipping_total: 200,
      discount_total: 100,
      total: 1100,
    });
    await order({
      number: "T-4",
      subtotal: 1000,
      tax_total: 190,
      tax_included: false,
      total: 1190,
    });
    await order({
      number: "T-5",
      subtotal: 1000,
      tax_total: 190,
      tax_included: true,
      total: 1000,
    });

    // Stock state has to match the status: a waiting order holds stock, a cancelled one never does.
    await rejects(
      q("UPDATE orders SET stock_state = 'released' WHERE id = $1", [id]),
      "23514",
    );
    await rejects(
      q("UPDATE orders SET status = 'processing' WHERE id = $1", [id]),
      "23514",
    );
    await q(
      "UPDATE orders SET status = 'processing', stock_state = 'committed' WHERE id = $1",
      [id],
    );
    await rejects(
      q(
        "UPDATE orders SET status = 'cancelled', stock_state = 'released' WHERE id = $1",
        [id],
      ),
      "23514", // a cancelled order needs its time
    );

    // One order per idempotency key and customer.
    await order({ number: "T-6", idempotency_key: "key-1" });
    await rejects(order({ number: "T-7", idempotency_key: "key-1" }), "23505");
    const other = (await insertCustomer({ email: "order2@example.com" }))
      .rows[0].id;
    await order({
      number: "T-7",
      idempotency_key: "key-1",
      customer_id: other,
    });
    await order({ number: "T-8" }); // no key: any number of them

    // Items: the line adds up, quantity is sane, and they outlive a deleted product.
    const product = (
      await q(
        "INSERT INTO products (slug, name) VALUES ('order-item', 'Item') RETURNING id",
      )
    ).rows[0].id;
    const variant = (
      await q(
        "INSERT INTO product_variants (product_id, sku) VALUES ($1, 'ORD-1') RETURNING id",
        [product],
      )
    ).rows[0].id;
    const item = (overrides = {}) => {
      const row = {
        order_id: id,
        product_id: product,
        variant_id: variant,
        product_slug: "order-item",
        name: "Item",
        sku: "ORD-1",
        quantity: 2,
        unit_amount: 500,
        line_total: 1000,
        ...overrides,
      };
      return q(
        `INSERT INTO order_items (${Object.keys(row).join(", ")})
         VALUES (${Object.keys(row)
           .map((_, i) => `$${i + 1}`)
           .join(", ")})`,
        Object.values(row),
      );
    };
    await item();
    await rejects(item({ line_total: 999 }), "23514");
    await rejects(item({ quantity: 0, line_total: 0 }), "23514");
    await rejects(item({ quantity: 100, line_total: 50000 }), "23514");

    // Payments: valid status and currency, one provider reference once.
    const payment = (overrides = {}) => {
      const row = {
        order_id: id,
        provider: "stripe",
        method: "card",
        amount: 1000,
        currency: "PKR",
        ...overrides,
      };
      return q(
        `INSERT INTO payments (${Object.keys(row).join(", ")})
         VALUES (${Object.keys(row)
           .map((_, i) => `$${i + 1}`)
           .join(", ")})`,
        Object.values(row),
      );
    };
    await payment({ provider_ref: "pi_1" });
    await rejects(payment({ provider_ref: "pi_1" }), "23505");
    await payment({ provider_ref: "pi_2" });
    await payment(); // several attempts without a reference are fine
    await rejects(payment({ status: "maybe" }), "23514");
    await rejects(payment({ currency: "USD" }), "23514");

    // History entries need a known actor.
    await q(
      "INSERT INTO order_status_history (order_id, to_status, actor_type) VALUES ($1, 'waiting_payment', 'customer')",
      [id],
    );
    await rejects(
      q(
        "INSERT INTO order_status_history (order_id, to_status, actor_type) VALUES ($1, 'waiting_payment', 'robot')",
        [id],
      ),
      "23514",
    );

    // Numbers come from a counter per market, and only the two markets exist.
    await rejects(
      q("INSERT INTO order_counters (market) VALUES ('FR')"),
      "23514",
    );
    const counters = await q(
      "SELECT market FROM order_counters ORDER BY market",
    );
    assert.deepEqual(
      counters.rows.map((row) => row.market),
      ["DE", "PK"],
    );

    // The order is a record: a purged product leaves the item (and its snapshot) in place.
    await q("DELETE FROM products WHERE id = $1", [product]);
    const left = await q(
      "SELECT product_id, variant_id, name FROM order_items WHERE order_id = $1",
      [id],
    );
    assert.deepEqual(left.rows, [
      { product_id: null, variant_id: null, name: "Item" },
    ]);

    // So is an order when the customer row is removed; and removing the order removes its parts.
    await q("DELETE FROM customers WHERE id = $1", [other]);
    const kept = await q("SELECT customer_id FROM orders WHERE number = 'T-7'");
    assert.equal(kept.rows[0].customer_id, null);
    await q("DELETE FROM orders WHERE id = $1", [id]);
    for (const table of ["order_items", "payments", "order_status_history"]) {
      const { rows } = await q(
        `SELECT count(*)::int AS n FROM ${table} WHERE order_id = $1`,
        [id],
      );
      assert.equal(rows[0].n, 0, `${table} should be removed with the order`);
    }
  });
});
