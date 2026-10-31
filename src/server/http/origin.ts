import { ApiError } from "./api-error";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isMutatingMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}

export interface OriginPolicy {
  /** The site's public origins (APP_ORIGINS). Required in production. */
  allowedOrigins?: string[];
  production: boolean;
}

/**
 * CSRF defence for cookie-based sessions: a request that changes data must
 * come from our own site. Browsers always attach Origin (and Sec-Fetch-Site)
 * to such requests and scripts on other sites cannot change them.
 * Requests with neither header come from non-browser clients (curl, apps,
 * server-to-server), which are not CSRF-able, so they pass.
 */
export function assertSameOrigin(request: Request, policy: OriginPolicy): void {
  if (policy.production && !policy.allowedOrigins?.length) {
    throw new Error("APP_ORIGINS must be set in production.");
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new ApiError("csrf_failed");
  }

  const origin = request.headers.get("origin");
  if (origin !== null) {
    const allowed = policy.allowedOrigins ?? [new URL(request.url).origin];
    if (!allowed.includes(origin)) throw new ApiError("csrf_failed");
  }
}
