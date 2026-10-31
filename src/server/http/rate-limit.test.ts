import { describe, expect, it } from "vitest";

import { ApiError } from "./api-error";
import {
  createRateLimiter,
  enforceRateLimits,
  type RateLimitRule,
} from "./rate-limit";

function clock(start = 1_000_000) {
  let time = start;
  return {
    now: () => time,
    advance(ms: number) {
      time += ms;
    },
  };
}

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks", () => {
    const c = clock();
    const limiter = createRateLimiter({ now: c.now });
    const results = Array.from({ length: 6 }, () =>
      limiter.check("login:1.1.1.1", 5, 60_000),
    );
    expect(results.slice(0, 5).every((r) => r.allowed)).toBe(true);
    expect(results.map((r) => r.remaining)).toEqual([4, 3, 2, 1, 0, 0]);
    expect(results[5].allowed).toBe(false);
    expect(results[5].retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("keeps different callers apart", () => {
    const limiter = createRateLimiter({ now: clock().now });
    for (let i = 0; i < 5; i++) limiter.check("a", 5, 60_000);
    expect(limiter.check("a", 5, 60_000).allowed).toBe(false);
    expect(limiter.check("b", 5, 60_000).allowed).toBe(true);
  });

  it("lets the caller back in after the window passes", () => {
    const c = clock(0);
    const limiter = createRateLimiter({ now: c.now });
    for (let i = 0; i < 5; i++) limiter.check("a", 5, 60_000);
    expect(limiter.check("a", 5, 60_000).allowed).toBe(false);
    c.advance(125_000);
    expect(limiter.check("a", 5, 60_000).allowed).toBe(true);
  });

  it("does not allow a double burst across the window edge", () => {
    const c = clock(0);
    const limiter = createRateLimiter({ now: c.now });
    c.advance(59_000);
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("a", 5, 60_000).allowed).toBe(true);
    }
    c.advance(2_000); // 1 s into the next window
    // a fixed-window limiter would allow 5 more here; the sliding one allows at most the faded sliver
    const allowed = Array.from(
      { length: 5 },
      () => limiter.check("a", 5, 60_000).allowed,
    ).filter(Boolean);
    expect(allowed.length).toBeLessThanOrEqual(1);
  });

  it("tells a blocked caller a retry time that actually works", () => {
    const c = clock(0);
    const limiter = createRateLimiter({ now: c.now });
    for (let i = 0; i < 5; i++) limiter.check("a", 5, 60_000);
    const blocked = limiter.check("a", 5, 60_000);
    c.advance(blocked.retryAfterSec * 1000);
    let result = limiter.check("a", 5, 60_000);
    // following the hint must succeed within one more hint at most
    if (!result.allowed) {
      c.advance(result.retryAfterSec * 1000);
      result = limiter.check("a", 5, 60_000);
    }
    expect(result.allowed).toBe(true);
  });

  it("does not count blocked attempts against the caller", () => {
    const c = clock(0);
    const limiter = createRateLimiter({ now: c.now });
    for (let i = 0; i < 5; i++) limiter.check("a", 5, 60_000);
    for (let i = 0; i < 1000; i++) limiter.check("a", 5, 60_000);
    c.advance(130_000);
    expect(limiter.check("a", 5, 60_000).allowed).toBe(true);
  });

  it("caps memory by evicting the least recently used callers", () => {
    const limiter = createRateLimiter({ now: clock().now, maxKeys: 3 });
    for (let i = 0; i < 5; i++) limiter.check("victim", 5, 60_000);
    // 3 fresh keys push "victim" out; its history is forgotten
    for (const key of ["x", "y", "z"]) limiter.check(key, 5, 60_000);
    expect(limiter.check("victim", 5, 60_000).remaining).toBe(4);
  });
});

describe("enforceRateLimits", () => {
  const rules = (a: number, b: number): RateLimitRule[] => [
    { key: "global:ip", limit: a, windowSec: 60 },
    { key: "route:ip", limit: b, windowSec: 60 },
  ];

  it("returns headers for the tightest rule", () => {
    const limiter = createRateLimiter({ now: clock().now });
    const headers = enforceRateLimits(limiter, rules(300, 3));
    expect(headers["RateLimit-Limit"]).toBe("3");
    expect(headers["RateLimit-Remaining"]).toBe("2");
  });

  it("throws rate_limited with Retry-After when any rule is exhausted", () => {
    const limiter = createRateLimiter({ now: clock().now });
    for (let i = 0; i < 2; i++) enforceRateLimits(limiter, rules(300, 2));
    try {
      enforceRateLimits(limiter, rules(300, 2));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(429);
      expect(apiError.code).toBe("rate_limited");
      expect(Number(apiError.headers?.["Retry-After"])).toBeGreaterThanOrEqual(
        1,
      );
      expect(apiError.headers?.["RateLimit-Remaining"]).toBe("0");
    }
  });
});
