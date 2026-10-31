import { randomBytes } from "node:crypto";

import { NextRequest } from "next/server";
import { QueryTypes } from "sequelize";

import { getSequelize } from "@/server/db/connection";

let counter = 0;

export function uniqueEmail(): string {
  counter += 1;
  return `user${counter}.${randomBytes(3).toString("hex")}@example.com`;
}

/** A fresh pretend visitor address, so rate limits never leak between tests. */
export function newIp(): string {
  counter += 1;
  return `203.0.${(counter >> 8) & 255}.${counter & 255}`;
}

type RouteHandler = (
  request: NextRequest,
  context?: never,
) => Promise<Response>;

export interface CallOptions {
  method?: string;
  path?: string;
  body?: unknown;
  /** Value of the session cookie to send. */
  cookie?: string;
  ip?: string;
  headers?: Record<string, string>;
}

export interface CallResult {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  raw: string;
  headers: Headers;
  /** Session cookie set by the response: its value, "" when cleared, undefined when untouched. */
  cookie: string | undefined;
}

/** Calls a route handler the way Next.js would, without a running server. */
export async function call(
  handler: RouteHandler,
  options: CallOptions = {},
): Promise<CallResult> {
  const method = options.method ?? "POST";
  const headers: Record<string, string> = {
    "x-real-ip": options.ip ?? newIp(),
    ...(options.body !== undefined
      ? { "content-type": "application/json" }
      : {}),
    ...(options.cookie !== undefined
      ? { cookie: `lz_session=${options.cookie}` }
      : {}),
    ...options.headers,
  };
  const request = new NextRequest(
    `https://luzanika.test${options.path ?? "/api/v1/x"}`,
    {
      method,
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    },
  );

  const response = await handler(request);
  const raw = await response.text();
  const setCookie = response.headers.get("set-cookie");
  const match = setCookie
    ? /(?:^|,\s*)lz_session=([^;]*)/.exec(setCookie)
    : null;

  return {
    status: response.status,
    body: raw ? JSON.parse(raw) : null,
    raw,
    headers: response.headers,
    cookie: match ? match[1] : undefined,
  };
}

/** Direct database access for arranging and checking test situations. */
export async function sql<T extends object = Record<string, unknown>>(
  query: string,
  replacements: Record<string, unknown> = {},
): Promise<T[]> {
  return getSequelize().query<T>(query, {
    replacements,
    type: QueryTypes.SELECT,
  });
}

export async function exec(
  query: string,
  replacements: Record<string, unknown> = {},
) {
  await getSequelize().query(query, { replacements });
}
