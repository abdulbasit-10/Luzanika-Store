#!/usr/bin/env node
/*
 * Database migration runner.
 *
 *   node db/migrate.mjs up                 apply every pending migration
 *   node db/migrate.mjs down [--steps N]   undo the last N migrations (default 1)
 *   node db/migrate.mjs status             list applied and pending migrations
 *   node db/migrate.mjs create <name>      scaffold the next up/down pair
 *
 * Flags: --test (use TEST_DATABASE_MIGRATION_URL), --allow-production
 *        (needed to run `down` when NODE_ENV=production), --dir <path>.
 *
 * A migration is two plain SQL files in db/migrations:
 *   0004_add_phone.up.sql   and   0004_add_phone.down.sql
 * Each runs in ONE transaction together with the bookkeeping row, so it is
 * applied completely or not at all. An applied migration must never be edited:
 * the runner stores a checksum and refuses to continue if a file changes.
 * Put `-- migrate:no-transaction` on the first line of an up or down file for
 * statements that cannot run in a transaction (e.g. CREATE INDEX CONCURRENTLY), and
 * `-- migrate:irreversible` in a down file that must never be run.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import pg from "pg";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NAME_PATTERN = /^(\d{4})_([a-z0-9]+(?:_[a-z0-9]+)*)$/;
const NO_TRANSACTION = "-- migrate:no-transaction";
const IRREVERSIBLE = "-- migrate:irreversible";
// Arbitrary constant: every runner takes the same lock, so two runs never overlap.
const LOCK_KEY = 726_400_101;
const LOCK_WAIT_MS = 60_000;

/** An expected failure: printed as a message, without a stack trace. */
class MigrationError extends Error {}

const fail = (message) => {
  throw new MigrationError(message);
};

const sha256 = (text) => createHash("sha256").update(text).digest("hex");
// Git may check files out with CRLF on Windows; the checksum must not care.
const normalise = (text) => text.replace(/\r\n/g, "\n");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------- settings

function resolveUrl({ test }) {
  const url = test
    ? process.env.TEST_DATABASE_MIGRATION_URL
    : (process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL);
  if (!url) {
    fail(
      test
        ? "TEST_DATABASE_MIGRATION_URL is not set."
        : "Neither DATABASE_MIGRATION_URL nor DATABASE_URL is set.",
    );
  }
  return url;
}

function parseUrl(url) {
  try {
    const parsed = new URL(url);
    const database = decodeURIComponent(parsed.pathname.slice(1));
    if (!/^postgres(ql)?:$/.test(parsed.protocol) || !database)
      throw new Error();
    return { database, host: `${parsed.hostname}:${parsed.port || 5432}` };
  } catch {
    // Never echo the URL: it contains the password.
    return fail("The database URL is not a valid postgres:// URL.");
  }
}

// ----------------------------------------------------------- migration files

async function loadMigrations(dir) {
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return fail(`Migrations folder not found: ${dir}`);
  }

  const byName = new Map();
  for (const file of entries) {
    const match = /^(.+)\.(up|down)\.sql$/.exec(file);
    if (!match) {
      if (file.endsWith(".sql")) {
        fail(`${file}: migration files must end in .up.sql or .down.sql.`);
      }
      continue;
    }
    const [, name, direction] = match;
    if (!NAME_PATTERN.test(name)) {
      fail(
        `${file}: name must look like 0001_short_description (4 digits, lowercase words joined by _).`,
      );
    }
    byName.set(name, { ...byName.get(name), [direction]: file });
  }

  const names = [...byName.keys()].sort();
  const migrations = [];
  for (const [index, name] of names.entries()) {
    const files = byName.get(name);
    if (!files.up) fail(`${name}: missing ${name}.up.sql.`);
    if (!files.down) fail(`${name}: missing ${name}.down.sql.`);

    const number = Number(name.slice(0, 4));
    if (number !== index + 1) {
      fail(
        `${name}: migrations must be numbered 0001, 0002, ... with no gaps or duplicates (expected ${String(index + 1).padStart(4, "0")}).`,
      );
    }

    const up = normalise(await readFile(path.join(dir, files.up), "utf8"));
    const down = normalise(await readFile(path.join(dir, files.down), "utf8"));
    if (up.trim() === "") fail(`${files.up} is empty.`);

    migrations.push({
      name,
      up,
      down,
      checksum: sha256(up),
      noTransaction: up.trimStart().startsWith(NO_TRANSACTION),
      downNoTransaction: down.trimStart().startsWith(NO_TRANSACTION),
      irreversible: down.trimStart().startsWith(IRREVERSIBLE),
    });
  }
  return migrations;
}

// ---------------------------------------------------------------- database

async function ensureBookkeeping(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      applied_by text NOT NULL DEFAULT current_user
    )
  `);
}

async function getApplied(client) {
  const { rows } = await client.query(
    "SELECT name, checksum, applied_at FROM schema_migrations ORDER BY name",
  );
  return rows;
}

/** Fails if what is recorded in the database no longer matches the files. */
function verifyHistory(migrations, applied) {
  const known = new Map(
    migrations.map((migration) => [migration.name, migration]),
  );

  for (const row of applied) {
    const migration = known.get(row.name);
    if (!migration) {
      fail(
        `${row.name} was applied to this database but its files are missing. Restore them from git.`,
      );
    }
    if (migration.checksum !== row.checksum) {
      fail(
        `${row.name} was changed after it was applied. Never edit an applied migration: write a new one.`,
      );
    }
  }

  const appliedNames = new Set(applied.map((row) => row.name));
  const firstPending = migrations.findIndex(
    (migration) => !appliedNames.has(migration.name),
  );
  if (
    firstPending !== -1 &&
    migrations
      .slice(firstPending)
      .some((migration) => appliedNames.has(migration.name))
  ) {
    fail(
      "Migrations were applied out of order. Fix the history before running more.",
    );
  }
}

async function acquireLock(client) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    const { rows } = await client.query(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [LOCK_KEY],
    );
    if (rows[0].locked) return;
    if (Date.now() > deadline) {
      fail(
        "Another migration run is still in progress. Try again in a minute.",
      );
    }
    await sleep(500);
  }
}

async function runInTransaction(client, work) {
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL lock_timeout = '10s'");
    await work();
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

async function applyOne(client, migration, direction) {
  const started = Date.now();
  const sql = direction === "up" ? migration.up : migration.down;
  const bookkeeping =
    direction === "up"
      ? () =>
          client.query(
            "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
            [migration.name, migration.checksum],
          )
      : () =>
          client.query("DELETE FROM schema_migrations WHERE name = $1", [
            migration.name,
          ]);

  try {
    const withoutTransaction =
      direction === "up"
        ? migration.noTransaction
        : migration.downNoTransaction;
    if (withoutTransaction) {
      await client.query(sql);
      await bookkeeping();
    } else {
      await runInTransaction(client, async () => {
        await client.query(sql);
        await bookkeeping();
      });
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error
        ? ` [${error.code}]`
        : "";
    fail(
      `${migration.name} (${direction}) failed and was rolled back: ${detail}${code}`,
    );
  }

  console.log(
    `${direction === "up" ? "applied" : "reverted"} ${migration.name} (${Date.now() - started} ms)`,
  );
}

// ---------------------------------------------------------------- commands

async function up(client, migrations) {
  const applied = await getApplied(client);
  verifyHistory(migrations, applied);

  const appliedNames = new Set(applied.map((row) => row.name));
  const pending = migrations.filter(
    (migration) => !appliedNames.has(migration.name),
  );
  if (pending.length === 0) {
    console.log("Database is up to date.");
    return;
  }
  for (const migration of pending) await applyOne(client, migration, "up");
  console.log(`Done: ${pending.length} migration(s) applied.`);
}

async function down(client, migrations, steps) {
  const applied = await getApplied(client);
  verifyHistory(migrations, applied);

  const toRevert = applied.slice(-steps).reverse();
  if (toRevert.length === 0) {
    console.log("Nothing to revert.");
    return;
  }
  const byName = new Map(
    migrations.map((migration) => [migration.name, migration]),
  );
  for (const row of toRevert) {
    if (byName.get(row.name).irreversible) {
      fail(`${row.name} is marked irreversible and cannot be rolled back.`);
    }
  }
  for (const row of toRevert)
    await applyOne(client, byName.get(row.name), "down");
  console.log(`Done: ${toRevert.length} migration(s) reverted.`);
}

async function status(client, migrations) {
  const applied = await getApplied(client);
  verifyHistory(migrations, applied);

  const appliedAt = new Map(applied.map((row) => [row.name, row.applied_at]));
  for (const migration of migrations) {
    const when = appliedAt.get(migration.name);
    console.log(
      `${when ? "applied" : "pending"} ${migration.name}${when ? `  (${when.toISOString()})` : ""}`,
    );
  }
  const pending = migrations.length - applied.length;
  console.log(`${applied.length} applied, ${pending} pending.`);
}

async function create(dir, rawName, existing) {
  const name = (rawName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!name)
    fail(
      "Give the migration a name: node db/migrate.mjs create add_phone_to_customers",
    );

  const number = String(existing.length + 1).padStart(4, "0");
  const base = path.join(dir, `${number}_${name}`);
  await writeFile(
    `${base}.up.sql`,
    "-- Describe what this migration does and why.\n",
    { flag: "wx" },
  );
  await writeFile(
    `${base}.down.sql`,
    "-- Undo the up migration exactly (or write `-- migrate:irreversible`).\n",
    { flag: "wx" },
  );
  console.log(`created ${number}_${name}.up.sql and .down.sql`);
}

// -------------------------------------------------------------------- main

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      test: { type: "boolean", default: false },
      "allow-production": { type: "boolean", default: false },
      steps: { type: "string", default: "1" },
      dir: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });

  const [command = "up", argument] = positionals;
  const commands = ["up", "down", "status", "create"];
  if (values.help || !commands.includes(command)) {
    console.log(
      "Usage: node db/migrate.mjs <up | down [--steps N] | status | create <name>> [--test] [--allow-production]",
    );
    process.exitCode = values.help ? 0 : 1;
    return;
  }

  const dir = path.resolve(
    values.dir ?? process.env.MIGRATIONS_DIR ?? path.join(HERE, "migrations"),
  );
  const migrations = await loadMigrations(dir);

  if (command === "create") {
    await create(dir, argument, migrations);
    return;
  }

  const steps = Number(values.steps);
  if (command === "down" && (!Number.isInteger(steps) || steps < 1)) {
    fail("--steps must be a whole number of 1 or more.");
  }
  if (
    command === "down" &&
    process.env.NODE_ENV === "production" &&
    !values["allow-production"]
  ) {
    fail(
      "Refusing to roll back in production. Pass --allow-production if you are sure.",
    );
  }

  const url = resolveUrl({ test: values.test });
  const target = parseUrl(url);
  if (values.test && !/_test$/i.test(target.database)) {
    fail(
      `--test requires a database whose name ends in _test (got "${target.database}").`,
    );
  }

  const client = new pg.Client({
    connectionString: url,
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: true }
        : false,
    application_name: "luzanika-migrate",
  });

  console.log(`Database: ${target.database} on ${target.host}`);
  try {
    await client.connect();
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? ` [${error.code}]`
        : "";
    fail(
      `Cannot connect to the database${code}. Check the URL and that PostgreSQL is running.`,
    );
  }

  try {
    await acquireLock(client);
    await ensureBookkeeping(client);
    if (command === "up") await up(client, migrations);
    if (command === "down") await down(client, migrations, steps);
    if (command === "status") await status(client, migrations);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  if (error instanceof MigrationError) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error(
      "Unexpected error:",
      error instanceof Error ? error.message : error,
    );
  }
  process.exitCode = 1;
});
