import { describe, expect, it } from "vitest";

import {
  buildApiContentSecurityPolicy,
  buildContentSecurityPolicy,
  securityHeaderRules,
} from "./security-headers";

const prod = { isDev: false };
const dev = { isDev: true };

function header(
  rules: ReturnType<typeof securityHeaderRules>,
  source: string,
  key: string,
) {
  return rules
    .find((rule) => rule.source === source)
    ?.headers.find((item) => item.key === key)?.value;
}

describe("content security policy (pages)", () => {
  const csp = buildContentSecurityPolicy(prod);

  it("only trusts the site itself by default", () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("img-src 'self' data: blob:");
  });

  it("blocks plugins, framing, base-tag and form hijacking", () => {
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("never allows eval or wildcard sources in production", () => {
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/(^|\s)\*(\s|;|$)/);
    expect(csp).not.toMatch(/https?:/);
  });

  it("upgrades insecure requests in production only", () => {
    expect(csp).toContain("upgrade-insecure-requests");
    expect(buildContentSecurityPolicy(dev)).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("allows eval and websockets only in development", () => {
    const devCsp = buildContentSecurityPolicy(dev);
    expect(devCsp).toContain("'unsafe-eval'");
    expect(devCsp).toContain("ws:");
  });
});

describe("content security policy (API)", () => {
  it("lets API responses load nothing", () => {
    const csp = buildApiContentSecurityPolicy();
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

describe("securityHeaderRules", () => {
  const rules = securityHeaderRules(prod);

  it("covers every route and applies the API policy last so it wins", () => {
    expect(rules[0].source).toBe("/:path*");
    expect(rules[rules.length - 1].source).toBe("/api/:path*");
    expect(header(rules, "/api/:path*", "Content-Security-Policy")).toBe(
      buildApiContentSecurityPolicy(),
    );
  });

  it("sets the standard protections", () => {
    expect(header(rules, "/:path*", "X-Content-Type-Options")).toBe("nosniff");
    expect(header(rules, "/:path*", "X-Frame-Options")).toBe("DENY");
    expect(header(rules, "/:path*", "Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(header(rules, "/:path*", "Cross-Origin-Opener-Policy")).toBe(
      "same-origin",
    );
    expect(header(rules, "/:path*", "Permissions-Policy")).toContain(
      "camera=()",
    );
  });

  it("sends HSTS in production but not in development", () => {
    expect(header(rules, "/:path*", "Strict-Transport-Security")).toMatch(
      /max-age=\d{7,}/,
    );
    expect(
      header(securityHeaderRules(dev), "/:path*", "Strict-Transport-Security"),
    ).toBeUndefined();
  });
});
