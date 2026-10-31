import "server-only";

import { z } from "zod";

const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\//, "must be a postgres:// connection URL");

const serverEnvSchema = z.object({
  /** What the running website connects with. Production: the limited role that cannot change the schema. */
  DATABASE_URL: postgresUrl,
  /** Only for running migrations. Falls back to DATABASE_URL in development. */
  DATABASE_MIGRATION_URL: postgresUrl.optional(),
  /** Set to "true" when the database requires TLS (managed databases, or a database on another server). */
  DATABASE_SSL: z.enum(["true", "false"]).default("false"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/**
 * Server-only settings, checked once on first use. It is lazy so `next build`
 * does not need the database settings. The error names the bad variables but
 * never prints their values (they contain passwords).
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const names = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid server environment variables: ${names}`);
  }

  cached = result.data;
  return cached;
}
