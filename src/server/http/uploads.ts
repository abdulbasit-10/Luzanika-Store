import { ApiError } from "./api-error";
import { readLimitedBody } from "./validation";

/** A little extra room for the multipart framing around the file itself. */
const FRAMING_BYTES = 64 * 1024;

/**
 * Reads one uploaded file from a multipart/form-data request. The size limit
 * is enforced while streaming, so an oversized upload is cut off instead of
 * being loaded into memory. Returns the raw bytes; the caller must still
 * check that they really are what they should be (see processAvatar).
 */
export async function readUploadedFile(
  request: Request,
  options: { field: string; maxBytes: number },
): Promise<Buffer> {
  const form = await readForm(request, options.maxBytes);

  const file = form.get(options.field);
  if (!(file instanceof File) || file.size === 0) {
    throw new ApiError("validation_failed", {
      message: "Please choose a file.",
      fields: { [options.field]: "Please choose a file." },
    });
  }
  if (file.size > options.maxBytes) throw new ApiError("payload_too_large");

  return Buffer.from(await file.arrayBuffer());
}

/**
 * Reads a multipart form with an optional file and some text fields (a payment
 * proof: a transaction ID and/or a screenshot). Same size rules as
 * readUploadedFile. Only the named text fields are returned; a field sent twice
 * or as a file is refused.
 */
export async function readUploadForm(
  request: Request,
  options: { fileField: string; textFields: string[]; maxBytes: number },
): Promise<{ file: Buffer | null; fields: Record<string, string> }> {
  const form = await readForm(request, options.maxBytes);

  const fields: Record<string, string> = {};
  for (const name of options.textFields) {
    const values = form.getAll(name);
    if (
      values.length > 1 ||
      values.some((value) => typeof value !== "string")
    ) {
      throw new ApiError("validation_failed", {
        message: "That field is not valid.",
        fields: { [name]: "That field is not valid." },
      });
    }
    if (typeof values[0] === "string" && values[0].trim() !== "") {
      fields[name] = values[0];
    }
  }

  const file = form.get(options.fileField);
  if (file === null || (file instanceof File && file.size === 0)) {
    return { file: null, fields };
  }
  if (!(file instanceof File)) {
    throw new ApiError("validation_failed", {
      message: "Please choose a file.",
      fields: { [options.fileField]: "Please choose a file." },
    });
  }
  if (file.size > options.maxBytes) throw new ApiError("payload_too_large");
  return { file: Buffer.from(await file.arrayBuffer()), fields };
}

async function readForm(request: Request, maxBytes: number): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    throw new ApiError("unsupported_media_type", {
      message: "The upload must be sent as multipart form data.",
    });
  }

  const bytes = await readLimitedBody(request, maxBytes + FRAMING_BYTES);

  try {
    return await new Response(new Blob([new Uint8Array(bytes)]), {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    throw new ApiError("bad_request", {
      message: "The upload could not be read.",
    });
  }
}
