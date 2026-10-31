import "server-only";

import pg from "pg";
import { Sequelize } from "sequelize";

import { getServerEnv } from "@/server/config/server-env";

declare global {
  // Kept on globalThis so hot reload in development reuses one connection pool.
  var __luzanikaSequelize: Sequelize | undefined;
}

function createSequelize(): Sequelize {
  const env = getServerEnv();

  return new Sequelize(env.DATABASE_URL, {
    dialect: "postgres",
    // Passing the driver in avoids the bundler having to find it dynamically.
    dialectModule: pg,
    // Query logging can leak personal data; keep it off.
    logging: false,
    pool: { max: env.DATABASE_POOL_MAX, min: 0, idle: 10_000, acquire: 15_000 },
    dialectOptions: {
      ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : false,
      // A runaway query or a transaction left open must not hold the database.
      statement_timeout: 15_000,
      idle_in_transaction_session_timeout: 30_000,
    },
    define: {
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    },
  });
}

/** The one Sequelize instance for this process. */
export function getSequelize(): Sequelize {
  globalThis.__luzanikaSequelize ??= createSequelize();
  return globalThis.__luzanikaSequelize;
}

export interface DatabasePing {
  ok: boolean;
  latencyMs: number;
}

/** Runs a trivial query to check the database is reachable. Never throws. */
export async function pingDatabase(): Promise<DatabasePing> {
  const started = Date.now();
  try {
    await getSequelize().query("SELECT 1");
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    // Only the error type is logged: messages can include connection details.
    console.error(
      "[db] ping failed:",
      error instanceof Error ? error.name : "unknown error",
    );
    return { ok: false, latencyMs: Date.now() - started };
  }
}
