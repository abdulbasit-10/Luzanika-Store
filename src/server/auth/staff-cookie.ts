import "server-only";

import type { NextRequest, NextResponse } from "next/server";

/**
 * The admin login cookie, separate from the customers' one. In production the
 * name starts with __Host-, which makes browsers refuse it unless it is
 * Secure, set for the whole site and not shared with subdomains. SameSite is
 * Strict: the admin never needs to be opened from a link on another site.
 */
export function staffCookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-lz_staff" : "lz_staff";
}

function attributes() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };
}

export function readStaffToken(request: NextRequest): string | undefined {
  return request.cookies.get(staffCookieName())?.value;
}

export function setStaffCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
): void {
  response.cookies.set({
    name: staffCookieName(),
    value: token,
    expires: expiresAt,
    ...attributes(),
  });
}

export function clearStaffCookie(response: NextResponse): void {
  response.cookies.set({
    name: staffCookieName(),
    value: "",
    maxAge: 0,
    ...attributes(),
  });
}
