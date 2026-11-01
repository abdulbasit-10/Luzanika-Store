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
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    throw new ApiError("unsupported_media_type", {
      message: "The upload must be sent as multipart form data.",
    });
  }

  const bytes = await readLimitedBody(
    request,
    options.maxBytes + FRAMING_BYTES,
  );

  let form: FormData;
  try {
    form = await new Response(new Blob([new Uint8Array(bytes)]), {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    throw new ApiError("bad_request", {
      message: "The upload could not be read.",
    });
  }

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
