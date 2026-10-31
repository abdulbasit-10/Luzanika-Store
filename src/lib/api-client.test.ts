import { describe, expect, it } from "vitest";

import { ApiError } from "./api-client";

describe("ApiError", () => {
  it("reads the API's error format: code, message and field messages", () => {
    const error = new ApiError("fallback", 400, {
      error: {
        code: "validation_failed",
        message: "Please check the highlighted fields.",
        fields: { email: "Enter a valid email", password: "Too short" },
        requestId: "req_1",
      },
    });
    expect(error.code).toBe("validation_failed");
    expect(error.fields).toEqual({
      email: "Enter a valid email",
      password: "Too short",
    });
    expect(error.status).toBe(400);
  });

  it("has no code or fields for network failures and unexpected bodies", () => {
    for (const data of [
      undefined,
      null,
      "oops",
      42,
      {},
      { error: "x" },
      { error: null },
    ]) {
      const error = new ApiError("failed", null, data);
      expect(error.code).toBeNull();
      expect(error.fields).toBeNull();
    }
  });

  it("ignores field values that are not strings", () => {
    const error = new ApiError("x", 400, {
      error: { code: "validation_failed", fields: { a: "ok", b: 5, c: null } },
    });
    expect(error.fields).toEqual({ a: "ok" });
  });

  it("treats an empty fields object as no fields", () => {
    const error = new ApiError("x", 400, {
      error: { code: "conflict", fields: {} },
    });
    expect(error.fields).toBeNull();
  });
});
