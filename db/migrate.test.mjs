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
});
