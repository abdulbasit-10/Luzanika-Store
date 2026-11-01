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
  /** A multipart upload. The content type (with its boundary) is set automatically. */
  form?: FormData;
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
  /** The response body exactly as sent, for images and other binary answers. */
  bytes: Buffer;
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
        options.form ??
        (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    },
  );

  const response = await handler(request);
  const bytes = Buffer.from(await response.arrayBuffer());
  const raw = bytes.toString("utf8");
  const isJson = (response.headers.get("content-type") ?? "").includes("json");
  const setCookie = response.headers.get("set-cookie");
  const match = setCookie
    ? /(?:^|,\s*)lz_session=([^;]*)/.exec(setCookie)
    : null;

  return {
    status: response.status,
    body: isJson && raw ? JSON.parse(raw) : null,
    raw,
    bytes,
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
