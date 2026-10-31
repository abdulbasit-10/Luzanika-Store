import { describe, expect, it } from "vitest";

import { ApiError } from "./api-error";
import {
  assertSameOrigin,
  isMutatingMethod,
  type OriginPolicy,
} from "./origin";

function req(headers: Record<string, string> = {}) {
  return new Request("https://luzanika.com/api/v1/anything", {
    method: "POST",
    headers,
  });
}

const dev: OriginPolicy = { production: false };
const prod: OriginPolicy = {
  production: true,
  allowedOrigins: ["https://luzanika.com"],
};

function code(fn: () => void): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof ApiError ? error.code : `other:${String(error)}`;
  }
  return undefined;
}

describe("isMutatingMethod", () => {
  it("treats only reads as safe", () => {
    for (const m of ["GET", "HEAD", "OPTIONS", "get"]) {
      expect(isMutatingMethod(m)).toBe(false);
    }
    for (const m of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(isMutatingMethod(m)).toBe(true);
    }
  });
});

describe("assertSameOrigin", () => {
  it("accepts the site's own origin", () => {
    expect(
      code(() =>
        assertSameOrigin(
          req({
            origin: "https://luzanika.com",
            "sec-fetch-site": "same-origin",
          }),
          prod,
        ),
      ),
    ).toBeUndefined();
  });

  it("rejects another site", () => {
    expect(
      code(() =>
        assertSameOrigin(req({ origin: "https://evil.example" }), prod),
      ),
    ).toBe("csrf_failed");
  });

  it("rejects cross-site and same-site fetch metadata even with a matching origin", () => {
    for (const site of ["cross-site", "same-site"]) {
      expect(
        code(() =>
          assertSameOrigin(
            req({ origin: "https://luzanika.com", "sec-fetch-site": site }),
            prod,
          ),
        ),
      ).toBe("csrf_failed");
    }
  });

  it("rejects the opaque 'null' origin", () => {
    expect(code(() => assertSameOrigin(req({ origin: "null" }), prod))).toBe(
      "csrf_failed",
    );
  });

  it("rejects a near-miss origin (different scheme, port or subdomain)", () => {
    for (const origin of [
      "http://luzanika.com",
      "https://luzanika.com:8443",
      "https://luzanika.com.evil.example",
      "https://shop.luzanika.com",
    ]) {
      expect(code(() => assertSameOrigin(req({ origin }), prod))).toBe(
        "csrf_failed",
      );
    }
  });

  it("lets non-browser clients (no Origin, no Sec-Fetch-Site) through", () => {
    expect(code(() => assertSameOrigin(req(), prod))).toBeUndefined();
  });

  it("uses the request's own origin when none are configured (development)", () => {
    expect(
      code(() =>
        assertSameOrigin(req({ origin: "https://luzanika.com" }), dev),
      ),
    ).toBeUndefined();
    expect(
      code(() =>
        assertSameOrigin(req({ origin: "https://evil.example" }), dev),
      ),
    ).toBe("csrf_failed");
  });

  it("refuses to run in production without APP_ORIGINS (fail closed)", () => {
    expect(code(() => assertSameOrigin(req(), { production: true }))).toMatch(
      /^other:/,
    );
  });
});
