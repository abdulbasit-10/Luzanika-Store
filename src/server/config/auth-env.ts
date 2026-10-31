import "server-only";

import { z } from "zod";

const authEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  /** bcrypt work factor. Each +1 doubles the time. 12 is about a quarter of a second on a modern server. */
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  /** Public address of the site, used to build links in emails. */
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

let cached: AuthEnv | undefined;

/** Settings for sign-in and password hashing, checked once on first use. */
export function getAuthEnv(): AuthEnv {
  if (cached) return cached;

  const result = authEnvSchema.safeParse(process.env);
  if (!result.success) {
    const names = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid auth environment variables: ${names}`);
  }
  // A weak work factor in production would make stolen hashes cheap to crack.
  if (result.data.NODE_ENV === "production" && result.data.BCRYPT_COST < 10) {
    throw new Error("Invalid auth environment variables: BCRYPT_COST");
  }

  cached = result.data;
  return cached;
}
