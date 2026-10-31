import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hashToken,
  generateToken,
  isWellFormedToken,
  fingerprint,
} from "./tokens";

describe("tokens", () => {
  it("generates long, unique, URL-safe tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isWellFormedToken(a)).toBe(true);
  });

  it("hashes to a stable 64-character hex string that is not the token", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).not.toBe(hashToken(generateToken()));
  });

  it("rejects anything not shaped like a token before it reaches the database", () => {
    for (const bad of [
      undefined,
      null,
      42,
      "",
      "short",
      "a".repeat(44),
      `${"a".repeat(42)}!`,
      `' OR 1=1 --${"a".repeat(32)}`,
    ]) {
      expect(isWellFormedToken(bad)).toBe(false);
    }
  });

  it("fingerprints without keeping the original", () => {
    expect(fingerprint("ada@example.com")).toMatch(/^[0-9a-f]{32}$/);
    expect(fingerprint("ada@example.com")).not.toContain("ada");
  });
});

describe("password hashing (bcrypt)", () => {
  afterEach(() => vi.resetModules());

  it("hashes and verifies, never storing the password", async () => {
    const { hashPassword, verifyPassword } = await import("./password");
    const hash = await hashPassword("my secret pass");
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(hash).not.toContain("secret");
    expect(await verifyPassword("my secret pass", hash)).toBe(true);
    expect(await verifyPassword("my secret pasS", hash)).toBe(false);
  });

  it("uses a new salt every time", async () => {
    const { hashPassword } = await import("./password");
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("treats a malformed stored hash as a failed login, not a crash", async () => {
    const { verifyPassword } = await import("./password");
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });

  it("flags hashes made with a weaker work factor for upgrade", async () => {
    vi.doMock("@/server/config/auth-env", () => ({
      getAuthEnv: () => ({
        BCRYPT_COST: 12,
        NODE_ENV: "test",
        NEXT_PUBLIC_SITE_URL: "http://x",
      }),
    }));
    const { needsRehash } = await import("./password");
    expect(needsRehash("$2b$10$" + "a".repeat(53))).toBe(true);
    expect(needsRehash("$2b$12$" + "a".repeat(53))).toBe(false);
    expect(needsRehash("garbage")).toBe(true);
    vi.doUnmock("@/server/config/auth-env");
  });

  it("the dummy check takes real time and always fails", async () => {
    const { verifyAgainstDummy } = await import("./password");
    expect(await verifyAgainstDummy("anything")).toBe(false);
  });
});
