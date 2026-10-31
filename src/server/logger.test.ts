import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger, serializeError } from "./logger";

describe("logger", () => {
  let lines: string[];

  beforeEach(() => {
    process.env.LOG_LEVEL = "debug";
    lines = [];
    vi.spyOn(console, "log").mockImplementation(
      (l) => void lines.push(String(l)),
    );
    vi.spyOn(console, "error").mockImplementation(
      (l) => void lines.push(String(l)),
    );
  });

  afterEach(() => {
    process.env.LOG_LEVEL = "silent";
    vi.restoreAllMocks();
  });

  it("writes one JSON object per line", () => {
    logger.info("hello", { requestId: "req_1" });
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({
      level: "info",
      msg: "hello",
      requestId: "req_1",
    });
    expect(typeof entry.time).toBe("string");
  });

  it("redacts secret and personal fields at any depth", () => {
    logger.info("x", {
      password: "p",
      user: { email: "a@b.co", authToken: "t", nested: { cookie: "c", ok: 1 } },
      sessionId: "s",
      phone: "+49",
      shippingAddress: "Street 1",
    });
    const out = lines[0];
    expect(out).not.toMatch(/"p"|a@b\.co|"t"|"c"|"s"|\+49|Street 1/);
    expect(JSON.parse(out).user.nested.ok).toBe(1);
  });

  it("cannot be spoofed by fields named msg, level or time", () => {
    logger.info("real", { msg: "fake", level: "debug", time: "yesterday" });
    const entry = JSON.parse(lines[0]);
    expect(entry.msg).toBe("real");
    expect(entry.level).toBe("info");
    expect(entry.time).not.toBe("yesterday");
  });

  it("truncates very long strings", () => {
    logger.info("x", { note: "a".repeat(5000) });
    expect(lines[0].length).toBeLessThan(1000);
  });

  it("respects LOG_LEVEL", () => {
    process.env.LOG_LEVEL = "warn";
    logger.info("hidden");
    logger.warn("shown");
    expect(lines).toHaveLength(1);
  });

  it("serializes errors without database detail", () => {
    const error = Object.assign(new Error("duplicate key"), {
      code: "23505",
      detail: "Key (email)=(jane@example.com) already exists.",
    });
    const serialized = JSON.stringify(serializeError(error));
    expect(serialized).toContain("23505");
    expect(serialized).not.toContain("jane@example.com");
  });
});
