import pg from "pg";

import { importSampleCatalog } from "../src/server/catalog/import-sample-catalog";

/**
 * Loads the sample catalogue into the database. Only adds what is missing, so
 * running it again never changes products or stock that already exist.
 *   npm run db:seed-catalog
 */
const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error(
    "Set DATABASE_MIGRATION_URL or DATABASE_URL (see .env.example).",
  );
  process.exit(1);
}

async function main() {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    const summary = await importSampleCatalog(pool);
    console.log("Catalogue import done:", summary);
  } catch (error) {
    console.error("Catalogue import failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
