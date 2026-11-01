import { describe, expect, it } from "vitest";

import { ApiError } from "./api-error";
import { readUploadedFile } from "./uploads";

const OPTIONS = { field: "photo", maxBytes: 1000 };

function upload(
  form: FormData | string | Uint8Array,
  headers: Record<string, string> = {},
) {
  return new Request("https://luzanika.test/api/v1/account/avatar", {
    method: "PUT",
    body: form as BodyInit,
    headers,
  });
}

function formWith(
  name: string,
  content: Uint8Array | string,
  filename = "me.jpg",
) {
  const form = new FormData();
  form.set(
    name,
    new File([content as BlobPart], filename, { type: "image/jpeg" }),
  );
  return form;
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

describe("readUploadedFile", () => {
  it("returns the bytes of the uploaded file", async () => {
    const bytes = await readUploadedFile(
      upload(formWith("photo", "hello world")),
      OPTIONS,
    );
    expect(bytes.toString()).toBe("hello world");
  });

  it("refuses requests that are not multipart", async () => {
    for (const request of [
      upload("{}", { "content-type": "application/json" }),
      upload("x", { "content-type": "text/plain" }),
      upload("x", { "content-type": "multipart/form-datax; boundary=a" }),
    ]) {
      expect((await failure(readUploadedFile(request, OPTIONS))).code).toBe(
        "unsupported_media_type",
      );
    }
  });

  it("asks for a file when the field is missing, is plain text, or the file is empty", async () => {
    const text = new FormData();
    text.set("photo", "not a file");
    for (const form of [
      formWith("other", "data"),
      text,
      formWith("photo", ""),
    ]) {
      const error = await failure(readUploadedFile(upload(form), OPTIONS));
      expect(error.code).toBe("validation_failed");
      expect(error.fields?.photo).toBeTruthy();
    }
  });

  it("rejects a file over the limit with 413", async () => {
    const error = await failure(
      readUploadedFile(
        upload(formWith("photo", new Uint8Array(5000))),
        OPTIONS,
      ),
    );
    expect(error.status).toBe(413);
  });

  it("cuts off an oversized body even when Content-Length lies", async () => {
    const body = new Uint8Array(500_000);
    const error = await failure(
      readUploadedFile(
        upload(body, {
          "content-type": "multipart/form-data; boundary=x",
          "content-length": "10",
        }),
        OPTIONS,
      ),
    );
    expect(error.status).toBe(413);
  });

  it("answers 400 for a broken multipart body instead of crashing", async () => {
    const error = await failure(
      readUploadedFile(
        upload("this is not a multipart body", {
          "content-type": "multipart/form-data; boundary=zzz",
        }),
        OPTIONS,
      ),
    );
    expect(["bad_request", "validation_failed"]).toContain(error.code);
  });

  it("refuses a request with no body", async () => {
    const request = new Request("https://luzanika.test/x", {
      method: "PUT",
      headers: { "content-type": "multipart/form-data; boundary=x" },
    });
    expect((await failure(readUploadedFile(request, OPTIONS))).code).toBe(
      "bad_request",
    );
  });
});
