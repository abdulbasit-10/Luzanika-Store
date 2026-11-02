import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "./secret-box";

const key = randomBytes(32);

describe("secret box", () => {
  it("gives back what was put in", () => {
    const stored = encryptSecret("JBSWY3DPEHPK3PXP", key);

    expect(decryptSecret(stored, key)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("does not contain the secret and differs every time", () => {
    const a = encryptSecret("JBSWY3DPEHPK3PXP", key);
    const b = encryptSecret("JBSWY3DPEHPK3PXP", key);

    expect(a).not.toContain("JBSWY3DPEHPK3PXP");
    expect(a).not.toBe(b);
  });

  it("refuses the wrong key", () => {
    const stored = encryptSecret("secret", key);

    expect(() => decryptSecret(stored, randomBytes(32))).toThrow();
  });

  it("notices a value that was changed", () => {
    const [version, iv, tag, encrypted] = encryptSecret("secret", key).split(
      ".",
    );
    const flipped = `${encrypted.slice(0, -2)}${encrypted.endsWith("AA") ? "BB" : "AA"}`;

    expect(() =>
      decryptSecret([version, iv, tag, flipped].join("."), key),
    ).toThrow();
  });

  it("refuses a value in an unknown format", () => {
    expect(() => decryptSecret("plain text", key)).toThrow();
    expect(() => decryptSecret("v2.a.b.c", key)).toThrow();
  });

  it("refuses a key of the wrong size", () => {
    expect(() => encryptSecret("secret", randomBytes(16))).toThrow();
  });
});
