import "server-only";

import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import { getHttpEnv } from "@/server/config/http-env";
import { logger, serializeError } from "@/server/logger";

import { ApiError } from "./api-error";
import { getClientIp } from "./client-ip";
import { assertSameOrigin, isMutatingMethod } from "./origin";
import { enforceRateLimits, getRateLimiter } from "./rate-limit";
import { errorBody } from "./responses";
import {
  DEFAULT_MAX_BODY_BYTES,
  fieldErrors,
  parseWith,
  queryToObject,
  readJsonBody,
} from "./validation";

/** Applied to every route per visitor; generous, only stops runaway scripts. */
const GLOBAL_LIMIT = { limit: 300, windowSec: 60 } as const;

type Params = Record<string, string | string[]>;

export interface RouteOptions {
  /** Short stable name used in logs and rate-limit buckets, e.g. "auth.login". */
  name: string;
  /** A stricter per-visitor limit for this route, on top of the global one. */
  rateLimit?: { limit: number; windowSec: number };
  /** Origin check for requests that change data. Only turn off for signed webhooks. Default: on. */
  csrf?: boolean;
  /** Largest JSON body accepted. Default: 100 KB. */
  maxBodyBytes?: number;
  /** Do not log successful requests (health checks). */
  quiet?: boolean;
}

export interface ApiContext<P extends Params = Params> {
  request: NextRequest;
  requestId: string;
  /** Visitor address (normalised), or "unknown" without a trusted proxy. */
  ip: string;
  params: P;
  /** Reads and validates the JSON body; throws a 400 with field messages on failure. */
  json<T>(schema: ZodType<T>): Promise<T>;
  /** Validates the query string; throws a 400 with field messages on failure. */
  query<T>(schema: ZodType<T>): T;
}

type Handler<P extends Params> = (
  context: ApiContext<P>,
) => Response | Promise<Response>;

function newRequestId(): string {
  return `req_${randomUUID().replaceAll("-", "")}`;
}

const CONNECTION_ERROR =
  /^Sequelize(Connection|HostNotFound|HostNotReachable|InvalidConnection)/;

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ZodError) {
    return new ApiError("validation_failed", {
      fields: fieldErrors(error),
      cause: error,
    });
  }
  if (error instanceof Error && CONNECTION_ERROR.test(error.name)) {
    return new ApiError("service_unavailable", {
      headers: { "Retry-After": "5" },
      cause: error,
    });
  }
  return new ApiError("internal_error", { cause: error });
}

/**
 * Wraps a route handler with everything every endpoint needs:
 * request id, origin (CSRF) check, rate limiting, request/response validation
 * helpers, one JSON error format that never leaks internals, safe headers and
 * a log line. Write handlers with this; do not export bare functions.
 *
 *   export const POST = route({ name: "contact.send", rateLimit: { limit: 3, windowSec: 3600 } },
 *     async ({ json }) => { const data = await json(contactSchema); ... });
 */
export function route<P extends Params = Params>(
  options: RouteOptions,
  handler: Handler<P>,
) {
  return async function handle(
    request: NextRequest,
    segment?: { params: Promise<P> },
  ): Promise<Response> {
    const requestId = newRequestId();
    const started = performance.now();
    let extraHeaders: Record<string, string> = {};
    let response: Response;
    let failure: ApiError | undefined;

    try {
      const env = getHttpEnv();
      const ip = getClientIp(request.headers, env.TRUST_PROXY);

      // The origin check comes first so a forged cross-site request cannot use up the visitor's rate limit.
      if (options.csrf !== false && isMutatingMethod(request.method)) {
        assertSameOrigin(request, {
          allowedOrigins: env.APP_ORIGINS,
          production: env.NODE_ENV === "production",
        });
      }

      const rules = [
        { key: `global:${ip}`, ...GLOBAL_LIMIT },
        ...(options.rateLimit
          ? [{ key: `${options.name}:${ip}`, ...options.rateLimit }]
          : []),
      ];
      extraHeaders = enforceRateLimits(getRateLimiter(), rules);

      response = await handler({
        request,
        requestId,
        ip,
        params: segment ? await segment.params : ({} as P),
        json: async (schema) =>
          parseWith(
            schema,
            await readJsonBody(
              request,
              options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
            ),
          ),
        query: (schema) =>
          parseWith(schema, queryToObject(request.nextUrl.searchParams)),
      });
    } catch (error) {
      // Next.js signals "this route is dynamic" and similar by throwing; those must pass through untouched.
      unstable_rethrow(error);
      failure = toApiError(error);
      extraHeaders = { ...extraHeaders, ...failure.headers };
      // Only server-side failures are worth a stack trace; client mistakes are not.
      if (failure.status >= 500) {
        logger.error("request failed", {
          requestId,
          route: options.name,
          error: serializeError(failure.cause ?? error),
        });
      }
      response = NextResponse.json(
        errorBody(failure.code, failure.message, requestId, failure.fields),
        { status: failure.status },
      );
    }

    for (const [name, value] of Object.entries(extraHeaders)) {
      response.headers.set(name, value);
    }
    response.headers.set("X-Request-Id", requestId);
    response.headers.set("X-Content-Type-Options", "nosniff");
    if (!response.headers.has("Cache-Control")) {
      response.headers.set("Cache-Control", "no-store");
    }

    const status = response.status;
    if (!(options.quiet && status < 400)) {
      // Path only: query strings can carry emails or tokens. No IP: it is personal data.
      const level =
        status >= 500
          ? "error"
          : status === 401 || status === 403 || status === 429
            ? "warn"
            : "info";
      logger[level]("request", {
        requestId,
        route: options.name,
        method: request.method,
        path: request.nextUrl.pathname.slice(0, 200),
        status,
        durationMs: Math.round(performance.now() - started),
        ...(failure ? { code: failure.code } : {}),
      });
    }

    return response;
  };
}
