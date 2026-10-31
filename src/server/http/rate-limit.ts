import { ApiError } from "./api-error";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until a blocked caller may try again (0 when allowed). */
  retryAfterSec: number;
  /** Seconds until the current window ends. */
  resetSec: number;
}

interface Entry {
  windowStart: number;
  windowMs: number;
  count: number;
  previousCount: number;
}

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): RateLimitResult;
}

export interface RateLimiterOptions {
  now?: () => number;
  /** Upper bound on remembered callers, so a flood of fake IPs cannot exhaust memory. */
  maxKeys?: number;
}

/**
 * Sliding-window counter: the previous window's count fades out linearly, so
 * there is no burst at the window edge. State lives in this process, which is
 * right for one server. With several instances, swap in a shared store
 * behind the same `check` signature.
 */
export function createRateLimiter({
  now = Date.now,
  maxKeys = 50_000,
}: RateLimiterOptions = {}): RateLimiter {
  const entries = new Map<string, Entry>();
  let calls = 0;

  function sweep(time: number): void {
    for (const [key, entry] of entries) {
      if (time >= entry.windowStart + 2 * entry.windowMs) entries.delete(key);
    }
  }

  return {
    check(key, limit, windowMs) {
      const time = now();
      if (++calls % 1000 === 0) sweep(time);

      const currentStart = Math.floor(time / windowMs) * windowMs;
      let entry = entries.get(key);

      if (!entry || currentStart >= entry.windowStart + 2 * windowMs) {
        entry = {
          windowStart: currentStart,
          windowMs,
          count: 0,
          previousCount: 0,
        };
      } else if (currentStart > entry.windowStart) {
        entry = {
          windowStart: currentStart,
          windowMs,
          count: 0,
          previousCount: entry.count,
        };
      }

      // Re-insert so the Map stays ordered by last use; the oldest are evicted first.
      entries.delete(key);
      entries.set(key, entry);
      while (entries.size > maxKeys) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }

      const elapsed = time - entry.windowStart;
      const windowEnd = entry.windowStart + windowMs;
      const used = entry.previousCount * (1 - elapsed / windowMs) + entry.count;
      const resetSec = Math.max(1, Math.ceil((windowEnd - time) / 1000));

      if (used >= limit) {
        // Wait until the fading previous count lets the caller back in, or until the window rolls.
        let waitMs = windowEnd - time;
        if (entry.previousCount > 0 && entry.count < limit) {
          const neededElapsed =
            windowMs * (1 - (limit - entry.count) / entry.previousCount);
          waitMs = Math.min(waitMs, neededElapsed - elapsed);
        }
        return {
          allowed: false,
          limit,
          remaining: 0,
          retryAfterSec: Math.max(1, Math.ceil(waitMs / 1000)),
          resetSec,
        };
      }

      entry.count += 1;
      return {
        allowed: true,
        limit,
        remaining: Math.max(0, Math.floor(limit - used - 1)),
        retryAfterSec: 0,
        resetSec,
      };
    },
  };
}

const globalForLimiter = globalThis as typeof globalThis & {
  __luzanikaRateLimiter?: RateLimiter;
};

/** One limiter per server process, kept across dev hot reloads. */
export function getRateLimiter(): RateLimiter {
  globalForLimiter.__luzanikaRateLimiter ??= createRateLimiter();
  return globalForLimiter.__luzanikaRateLimiter;
}

export interface RateLimitRule {
  /** Identifies the bucket, e.g. "auth.login:203.0.113.7". */
  key: string;
  limit: number;
  windowSec: number;
}

/**
 * Checks every rule. Throws `rate_limited` (with Retry-After) if any is
 * exhausted; otherwise returns the RateLimit-* headers of the tightest rule.
 */
export function enforceRateLimits(
  limiter: RateLimiter,
  rules: RateLimitRule[],
): Record<string, string> {
  let tightest: RateLimitResult | undefined;

  for (const rule of rules) {
    const result = limiter.check(rule.key, rule.limit, rule.windowSec * 1000);
    if (!result.allowed) {
      throw new ApiError("rate_limited", {
        headers: {
          "Retry-After": String(result.retryAfterSec),
          ...rateLimitHeaders(result),
        },
      });
    }
    if (!tightest || result.remaining < tightest.remaining) tightest = result;
  }

  return tightest ? rateLimitHeaders(tightest) : {};
}

function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(result.resetSec),
  };
}
