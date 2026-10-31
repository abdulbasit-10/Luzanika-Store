import "server-only";

import bcrypt from "bcrypt";

import { getAuthEnv } from "@/server/config/auth-env";

/** Hashes a password with bcrypt (salt included in the result). Runs off the main thread. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, getAuthEnv().BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    // A malformed stored hash must never log anyone in.
    return false;
  }
}

/** True when the stored hash was made with a weaker work factor than we use now. */
export function needsRehash(hash: string): boolean {
  const cost = Number(/^\$2[abxy]\$(\d{2})\$/.exec(hash)?.[1]);
  return !Number.isFinite(cost) || cost < getAuthEnv().BCRYPT_COST;
}

let dummyHash: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("dummy-password-for-timing-only");
  return dummyHash;
}

// Started as soon as this module loads, so even the very first unknown-email login takes as long as every other one.
getDummyHash().catch(() => {
  dummyHash = undefined;
});

/**
 * Spends the same time as a real password check. Used when the email does not
 * exist, so a response that is faster for unknown emails cannot reveal who has an account.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  await bcrypt.compare(password, await getDummyHash());
  return false;
}
