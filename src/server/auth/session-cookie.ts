import "server-only";

import type { NextRequest, NextResponse } from "next/server";

/**
 * The login cookie. In production the name starts with __Host-, which makes
 * browsers refuse it unless it is Secure, set for the whole site and not
 * shared with subdomains. Locally (plain http) that prefix cannot be used.
 */
export function sessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Host-lz_session"
    : "lz_session";
}

function attributes() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function readSessionToken(request: NextRequest): string | undefined {
  return request.cookies.get(sessionCookieName())?.value;
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
): void {
  response.cookies.set({
    name: sessionCookieName(),
    value: token,
    expires: expiresAt,
    ...attributes(),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: sessionCookieName(),
    value: "",
    maxAge: 0,
    ...attributes(),
  });
}
