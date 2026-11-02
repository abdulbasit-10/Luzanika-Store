import { randomBytes } from "node:crypto";

import { Secret, TOTP } from "otpauth";

import { hashToken } from "./tokens";

const ISSUER = "Luzanika Admin";
const PERIOD_SECONDS = 30;
/** One step before and after the current one is accepted, for clocks that are a little off. */
const WINDOW = 1;

function totpFor(secretBase32: string, label: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: PERIOD_SECONDS,
    secret: Secret.fromBase32(secretBase32),
  });
}

/** A new random secret (base32, 160 bits) for an authenticator app. */
export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

/** The `otpauth://` link the admin page turns into a QR code for the authenticator app. */
export function totpUri(secretBase32: string, accountEmail: string): string {
  return totpFor(secretBase32, accountEmail).toString();
}

/** The 30-second step a moment falls in. Saved after a code is used, so the same code cannot be used twice. */
export function stepAt(timeMs: number): number {
  return Math.floor(timeMs / 1000 / PERIOD_SECONDS);
}

/**
 * Checks a 6-digit code. Returns the step it belongs to when it is valid and
 * newer than `lastUsedStep`, otherwise null (wrong, expired, or already used).
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  lastUsedStep: number | null,
  nowMs: number = Date.now(),
): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const delta = totpFor(secretBase32, "check").validate({
    token: code,
    timestamp: nowMs,
    window: WINDOW,
  });
  if (delta === null) return null;

  const step = stepAt(nowMs) + delta;
  return lastUsedStep !== null && step <= lastUsedStep ? null : step;
}

/** A code for a given moment. Used by tests, and never needed by the app itself. */
export function totpCodeAt(secretBase32: string, timeMs: number): string {
  return totpFor(secretBase32, "check").generate({ timestamp: timeMs });
}

const RECOVERY_CODE_COUNT = 10;

/** Recovery codes look like "a1b2c-3d4e5" and are shown to the staff member once. */
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const hex = randomBytes(5).toString("hex");
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
}

/** Normalises what a person types ("A1B2C 3D4E5") so it matches the stored form. */
export function normalizeRecoveryCode(input: string): string | null {
  const cleaned = input.trim().toLowerCase().replace(/[\s-]/g, "");
  return /^[0-9a-f]{10}$/.test(cleaned)
    ? `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`
    : null;
}

/** Only the hash of a recovery code is stored. The codes are random, so no salt is needed. */
export function hashRecoveryCode(code: string): string {
  return hashToken(code);
}
