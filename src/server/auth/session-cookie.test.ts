import { NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearSessionCookie,
  sessionCookieName,
  setSessionCookie,
} from "./session-cookie";

afterEach(() => vi.unstubAllEnvs());

function setCookieHeader(apply: (response: NextResponse) => void): string {
  const response = NextResponse.json({});
  apply(response);
  return response.headers.get("set-cookie") ?? "";
}

describe("session cookie", () => {
  it("is httpOnly, SameSite=Lax and site-wide", () => {
    const header = setCookieHeader((r) =>
      setSessionCookie(r, "tok", new Date(Date.now() + 86_400_000)),
    );
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=lax/i);
    expect(header).toMatch(/Path=\//);
    expect(header).toMatch(/Expires=/);
  });

  it("uses the __Host- prefix and Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(sessionCookieName()).toBe("__Host-lz_session");
    const header = setCookieHeader((r) =>
      setSessionCookie(r, "tok", new Date(Date.now() + 1000)),
    );
    expect(header).toMatch(/^__Host-lz_session=tok/);
    expect(header).toMatch(/Secure/i);
    expect(header).not.toMatch(/Domain=/i);
  });

  it("works on plain http during development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(sessionCookieName()).toBe("lz_session");
    const header = setCookieHeader((r) =>
      setSessionCookie(r, "tok", new Date(Date.now() + 1000)),
    );
    expect(header).not.toMatch(/Secure/i);
  });

  it("clears the cookie with the same name and path", () => {
    const header = setCookieHeader((r) => clearSessionCookie(r));
    expect(header).toMatch(/lz_session=;/);
    expect(header).toMatch(/Max-Age=0/i);
    expect(header).toMatch(/Path=\//);
  });
});
