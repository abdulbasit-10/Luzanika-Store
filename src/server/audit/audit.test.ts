import { describe, expect, it } from "vitest";

import { redactForAudit } from "./audit";

describe("redactForAudit", () => {
  it("replaces anything that looks like a secret, however deep", () => {
    expect(
      redactForAudit({
        email: "ada@example.com",
        passwordHash: "$2b$12$abc",
        nested: { totpSecretEnc: "v1.a.b.c", sessionToken: "t", keep: 1 },
        list: [{ recoveryCode: "a1b2c-3d4e5", ok: true }],
      }),
    ).toEqual({
      email: "ada@example.com",
      passwordHash: "[redacted]",
      nested: {
        totpSecretEnc: "[redacted]",
        sessionToken: "[redacted]",
        keep: 1,
      },
      list: [{ recoveryCode: "[redacted]", ok: true }],
    });
  });

  it("writes dates as text and keeps plain values", () => {
    expect(redactForAudit(new Date("2026-11-02T10:00:00Z"))).toBe(
      "2026-11-02T10:00:00.000Z",
    );
    expect(redactForAudit(5)).toBe(5);
    expect(redactForAudit(true)).toBe(true);
    expect(redactForAudit(null)).toBeNull();
    expect(redactForAudit(undefined)).toBeNull();
  });

  it("cuts very long text and very deep structures", () => {
    expect(String(redactForAudit("a".repeat(5000))).length).toBeLessThan(2100);

    let deep: unknown = "end";
    for (let i = 0; i < 10; i++) deep = { next: deep };
    expect(JSON.stringify(redactForAudit(deep))).toContain("[truncated]");
  });
});
