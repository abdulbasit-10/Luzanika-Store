import { z, type ZodType } from "zod";

import { ApiError } from "./api-error";

export const DEFAULT_MAX_BODY_BYTES = 100_000;

/** Flattens zod issues into { "field.path": "first message" } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".") || "_form";
    fields[path] ??= issue.message;
  }
  return fields;
}

/** Validates `data`; throws a 400 `validation_failed` with per-field messages. */
export function parseWith<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError("validation_failed", {
      fields: fieldErrors(result.error),
    });
  }
  return result.data;
}

/**
 * Reads the JSON body with hard limits: must be application/json, must not
 * exceed `maxBytes` (counted while streaming, not trusted from the header),
 * and must parse.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType)) {
    throw new ApiError("unsupported_media_type");
  }

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ApiError("payload_too_large");
  }

  if (!request.body) {
    throw new ApiError("bad_request", { message: "A JSON body is required." });
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new ApiError("payload_too_large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ApiError("bad_request", { message: "The body must be UTF-8." });
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("bad_request", {
      message: "The body must be valid JSON.",
    });
  }
}

/** Query string as an object; a repeated key (?a=1&a=2) becomes an array. */
export function queryToObject(
  searchParams: URLSearchParams,
): Record<string, string | string[]> {
  // A Map (not a plain object) so a key like "__proto__" can never touch the prototype.
  const values = new Map<string, string | string[]>();
  for (const [key, value] of searchParams) {
    const existing = values.get(key);
    if (existing === undefined) values.set(key, value);
    else if (Array.isArray(existing)) existing.push(value);
    else values.set(key, [existing, value]);
  }
  return Object.fromEntries(values);
}
