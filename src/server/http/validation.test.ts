import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ApiError } from "./api-error";
import {
  fieldErrors,
  parseWith,
  queryToObject,
  readJsonBody,
} from "./validation";

function post(body: BodyInit | null, headers: Record<string, string> = {}) {
  return new Request("https://luzanika.com/api/v1/x", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error("expected a rejection");
}

describe("readJsonBody", () => {
  it("parses valid JSON", async () => {
    expect(await readJsonBody(post('{"a":1}'))).toEqual({ a: 1 });
  });

  it("accepts a charset parameter", async () => {
    const body = await readJsonBody(
      post("{}", { "content-type": "application/json; charset=utf-8" }),
    );
    expect(body).toEqual({});
  });

  it("rejects other content types with 415", async () => {
    for (const type of [
      "text/plain",
      "application/x-www-form-urlencoded",
      "",
    ]) {
      const error = await failure(
        readJsonBody(post("{}", { "content-type": type })),
      );
      expect(error.code).toBe("unsupported_media_type");
    }
  });

  it("rejects look-alike content types", async () => {
    const error = await failure(
      readJsonBody(post("{}", { "content-type": "application/jsonp" })),
    );
    expect(error.code).toBe("unsupported_media_type");
  });

  it("rejects invalid JSON with 400 and no parser details", async () => {
    const error = await failure(readJsonBody(post("{oops")));
    expect(error.code).toBe("bad_request");
    expect(error.message).toBe("The body must be valid JSON.");
  });

  it("rejects a missing body", async () => {
    const error = await failure(readJsonBody(post(null)));
    expect(error.code).toBe("bad_request");
  });

  it("rejects invalid UTF-8", async () => {
    const error = await failure(
      readJsonBody(post(new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]))),
    );
    expect(error.code).toBe("bad_request");
  });

  it("rejects an oversized body by its real size, not the declared one", async () => {
    const big = JSON.stringify({ text: "x".repeat(2000) });
    const error = await failure(
      readJsonBody(post(big, { "content-length": "10" }), 1000),
    );
    expect(error.code).toBe("payload_too_large");
  });

  it("rejects when the declared length is already too big", async () => {
    const error = await failure(
      readJsonBody(post("{}", { "content-length": "999999" }), 1000),
    );
    expect(error.status).toBe(413);
  });

  it("keeps __proto__ as plain data", async () => {
    const body = (await readJsonBody(post('{"__proto__":{"admin":true}}'))) as {
      admin?: boolean;
    };
    expect(body.admin).toBeUndefined();
    expect(({} as { admin?: boolean }).admin).toBeUndefined();
  });
});

describe("parseWith / fieldErrors", () => {
  const schema = z.object({
    email: z.string().email("Please enter a valid email address"),
    items: z.array(z.object({ qty: z.number().int().min(1, "At least 1") })),
  });

  it("returns typed data when valid", () => {
    expect(parseWith(schema, { email: "a@b.co", items: [{ qty: 2 }] })).toEqual(
      {
        email: "a@b.co",
        items: [{ qty: 2 }],
      },
    );
  });

  it("throws validation_failed with the first message per field path", () => {
    try {
      parseWith(schema, { email: "nope", items: [{ qty: 0 }] });
      expect.unreachable();
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.code).toBe("validation_failed");
      expect(apiError.status).toBe(400);
      expect(apiError.fields).toEqual({
        email: "Please enter a valid email address",
        "items.0.qty": "At least 1",
      });
    }
  });

  it("files root-level problems under _form", () => {
    const result = z.string().safeParse(5);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(fieldErrors(result.error))).toEqual(["_form"]);
    }
  });
});

describe("queryToObject", () => {
  it("turns repeated keys into arrays", () => {
    expect(queryToObject(new URLSearchParams("a=1&b=2&a=3&a=4"))).toEqual({
      a: ["1", "3", "4"],
      b: "2",
    });
  });

  it("cannot be used to poison the prototype", () => {
    const result = queryToObject(
      new URLSearchParams("__proto__=1&__proto__=2&constructor=x"),
    );
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.keys(result)).toContain("__proto__");
  });
});
