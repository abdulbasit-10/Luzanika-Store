import { describe, expect, it } from "vitest";

import { getClientIp, normalizeIp } from "./client-ip";

describe("normalizeIp", () => {
  it("keeps IPv4 as is", () => {
    expect(normalizeIp("203.0.113.7")).toBe("203.0.113.7");
  });

  it("unwraps IPv4-mapped IPv6", () => {
    expect(normalizeIp("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("reduces IPv6 to its /64 so one visitor cannot rotate addresses", () => {
    const a = normalizeIp("2001:db8:1:2:aaaa:bbbb:cccc:dddd");
    const b = normalizeIp("2001:db8:1:2::1");
    expect(a).toBe("2001:0db8:0001:0002::/64");
    expect(b).toBe(a);
    expect(normalizeIp("2001:db8:1:3::1")).not.toBe(a);
  });

  it("handles :: at the start and end", () => {
    expect(normalizeIp("::1")).toBe("0000:0000:0000:0000::/64");
    expect(normalizeIp("2001:db8::")).toBe("2001:0db8:0000:0000::/64");
  });

  it("rejects garbage", () => {
    expect(normalizeIp("not-an-ip")).toBeUndefined();
    expect(normalizeIp("999.1.1.1")).toBeUndefined();
    expect(normalizeIp("")).toBeUndefined();
  });
});

describe("getClientIp", () => {
  const headers = (init: Record<string, string>) => new Headers(init);

  it("ignores forwarding headers when no proxy is trusted", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "1.2.3.4" }), false)).toBe(
      "unknown",
    );
  });

  it("uses X-Real-IP from a trusted proxy", () => {
    expect(getClientIp(headers({ "x-real-ip": "198.51.100.9" }), true)).toBe(
      "198.51.100.9",
    );
  });

  it("uses the LAST X-Forwarded-For entry, never the forgeable first one", () => {
    expect(
      getClientIp(
        headers({ "x-forwarded-for": "6.6.6.6, 10.0.0.1, 198.51.100.9" }),
        true,
      ),
    ).toBe("198.51.100.9");
  });

  it("falls back to unknown for invalid or missing values", () => {
    expect(getClientIp(headers({ "x-real-ip": "evil" }), true)).toBe("unknown");
    expect(getClientIp(headers({}), true)).toBe("unknown");
  });
});
