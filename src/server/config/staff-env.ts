import "server-only";

import { z } from "zod";

const staffEnvSchema = z.object({
  /**
   * 32 random bytes as base64. Generate one with:
   *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   * It encrypts the authenticator-app secrets of staff, so a copy of the
   * database alone cannot be used to make valid codes. Keep it out of the
   * database and out of git.
   */
  STAFF_2FA_ENCRYPTION_KEY: z
    .string()
    .trim()
    .refine((value) => Buffer.from(value, "base64").length === 32, {
      message: "must be 32 random bytes encoded as base64",
    }),
});

export interface StaffEnv {
  /** The raw 32-byte encryption key. */
  twoFactorKey: Buffer;
}

let cached: StaffEnv | undefined;

/** Settings for the admin area, checked once on first use. The error names the variable, never its value. */
export function getStaffEnv(): StaffEnv {
  if (cached) return cached;

  const result = staffEnvSchema.safeParse(process.env);
  if (!result.success) {
    const names = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid admin environment variables: ${names}`);
  }

  cached = {
    twoFactorKey: Buffer.from(result.data.STAFF_2FA_ENCRYPTION_KEY, "base64"),
  };
  return cached;
}
