import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

import pg from "pg";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/**
 * Creates a throw-away database, applies every migration to it, and drops it
 * when the run ends. Your real data is never touched.
 * Needs a login that can create databases (the dev `postgres` login can).
 */
export default async function setup(project: TestProject) {
  const adminUrl =
    process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
  if (!adminUrl) {
    throw new Error(
      "Set DATABASE_URL (in .env.local) to run the integration tests.",
    );
  }

  const name = `luzanika_it_${randomBytes(4).toString("hex")}_test`;
  const testUrl = new URL(adminUrl);
  testUrl.pathname = `/${name}`;

  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.end();
  }

  try {
    execFileSync(process.execPath, ["db/migrate.mjs", "up"], {
      env: {
        ...process.env,
        DATABASE_MIGRATION_URL: testUrl.toString(),
        DATABASE_URL: testUrl.toString(),
      },
      stdio: "pipe",
    });
  } catch (error) {
    await dropDatabase(adminUrl, name);
    throw new Error(
      `Migrations failed on the test database: ${(error as { stderr?: Buffer }).stderr?.toString() ?? error}`,
    );
  }

  project.provide("databaseUrl", testUrl.toString());

  return async () => {
    await dropDatabase(adminUrl, name);
  };
}

async function dropDatabase(adminUrl: string, name: string) {
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  } finally {
    await admin.end();
  }
}
