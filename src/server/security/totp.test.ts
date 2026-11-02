import { describe, expect, it } from "vitest";

import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  normalizeRecoveryCode,
  stepAt,
  totpCodeAt,
  totpUri,
  verifyTotp,
} from "./totp";

const secret = generateTotpSecret();
const NOW = Date.UTC(2026, 10, 2, 12, 0, 10);

describe("totp", () => {
  it("makes a base32 secret that is different every time", () => {
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(generateTotpSecret()).not.toBe(secret);
  });

  it("builds the link an authenticator app understands", () => {
    const uri = totpUri(secret, "ada@example.com");

    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain("issuer=Luzanika");
    expect(uri).toContain("ada%40example.com");
  });

  it("accepts the current code and returns its step", () => {
    const code = totpCodeAt(secret, NOW);

    expect(verifyTotp(secret, code, null, NOW)).toBe(stepAt(NOW));
  });

  it("accepts a code from one step before or after, for slightly wrong clocks", () => {
    expect(
      verifyTotp(secret, totpCodeAt(secret, NOW - 30_000), null, NOW),
    ).toBe(stepAt(NOW) - 1);
    expect(
      verifyTotp(secret, totpCodeAt(secret, NOW + 30_000), null, NOW),
    ).toBe(stepAt(NOW) + 1);
  });

  it("refuses a code that is too old or too new", () => {
    expect(
      verifyTotp(secret, totpCodeAt(secret, NOW - 90_000), null, NOW),
    ).toBeNull();
    expect(
      verifyTotp(secret, totpCodeAt(secret, NOW + 90_000), null, NOW),
    ).toBeNull();
  });

  it("refuses a code that was already used, or an older one", () => {
    const step = stepAt(NOW);
    const code = totpCodeAt(secret, NOW);

    expect(verifyTotp(secret, code, step, NOW)).toBeNull();
    expect(
      verifyTotp(secret, totpCodeAt(secret, NOW - 30_000), step, NOW),
    ).toBeNull();
    expect(
      verifyTotp(secret, totpCodeAt(secret, NOW + 30_000), step, NOW),
    ).toBe(step + 1);
  });

  it("refuses anything that is not six digits", () => {
    for (const bad of ["", "12345", "1234567", "abcdef", "12 345"]) {
      expect(verifyTotp(secret, bad, null, NOW)).toBeNull();
    }
  });

  it("refuses a code made with another secret", () => {
    const other = totpCodeAt(generateTotpSecret(), NOW);

    expect(verifyTotp(secret, other, null, NOW)).toBeNull();
  });
});

describe("recovery codes", () => {
  it("makes ten different codes in a form that is easy to type", () => {
    const codes = generateRecoveryCodes();

    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/);
  });

  it("accepts the code however it was typed", () => {
    expect(normalizeRecoveryCode("A1B2C-3D4E5")).toBe("a1b2c-3d4e5");
    expect(normalizeRecoveryCode(" a1b2c 3d4e5 ")).toBe("a1b2c-3d4e5");
    expect(normalizeRecoveryCode("a1b2c3d4e5")).toBe("a1b2c-3d4e5");
  });

  it("refuses something that cannot be a code", () => {
    expect(normalizeRecoveryCode("")).toBeNull();
    expect(normalizeRecoveryCode("a1b2c-3d4e")).toBeNull();
    expect(normalizeRecoveryCode("zzzzz-zzzzz")).toBeNull();
  });

  it("stores only a hash that is not the code", () => {
    const hash = hashRecoveryCode("a1b2c-3d4e5");

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("a1b2c");
    expect(hashRecoveryCode("a1b2c-3d4e5")).toBe(hash);
  });
});
