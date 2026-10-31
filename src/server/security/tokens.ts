import { createHash, randomBytes } from "node:crypto";

/** 256 random bits, URL-safe. This is what goes into cookies and email links. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** The only form of a token that is ever stored: its SHA-256 hash. Tokens are random, so no salt is needed. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

/** Cheap check before touching the database: anything not shaped like our tokens cannot be one. */
export function isWellFormedToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_FORMAT.test(value);
}

/** Short stable fingerprint for rate-limit keys, so addresses are not kept in memory as text. */
export function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}
