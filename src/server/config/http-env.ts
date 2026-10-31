import "server-only";

import { z } from "zod";

function isOrigin(value: string): boolean {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}

const httpEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  /**
   * "true" when the app runs behind a reverse proxy (nginx) that sets
   * X-Real-IP / X-Forwarded-For. Needed to tell visitors apart for rate limits.
   * Never enable it when the app is reachable directly, or visitors could fake their IP.
   */
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  /**
   * Comma-separated list of the site's public origins, e.g. "https://luzanika.com".
   * Browser requests that change data are only accepted from these. Required in production.
   */
  APP_ORIGINS: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined,
    )
    .pipe(
      z
        .array(
          z
            .string()
            .refine(isOrigin, "must be an origin like https://luzanika.com"),
        )
        .min(1)
        .optional(),
    ),
});

export type HttpEnv = z.infer<typeof httpEnvSchema>;

let cached: HttpEnv | undefined;

/**
 * Settings for the HTTP layer (proxy, allowed origins). Kept apart from the
 * database settings so a missing database URL cannot break the health check.
 */
export function getHttpEnv(): HttpEnv {
  if (cached) return cached;

  const result = httpEnvSchema.safeParse(process.env);
  if (!result.success) {
    const names = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid HTTP environment variables: ${names}`);
  }

  cached = result.data;
  return cached;
}
