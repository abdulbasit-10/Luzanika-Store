import "server-only";

import sharp from "sharp";

import { ApiError } from "@/server/http/api-error";

export const AVATAR_SIZE = 256;
export const AVATAR_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Decoded size limit (width x height), so a tiny file that expands into a huge image cannot exhaust memory. */
const MAX_INPUT_PIXELS = 25_000_000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

function rejected(message: string): ApiError {
  return new ApiError("validation_failed", {
    message,
    fields: { photo: message },
  });
}

/**
 * Turns an uploaded picture into a small square WebP. What the file claims to
 * be (its name or type) is ignored: only what the image decoder finds counts.
 * Re-encoding also removes everything hidden in the original (GPS location,
 * camera details, embedded scripts or other payloads) and applies the phone's
 * rotation, so the stored file is only pixels.
 */
export async function processAvatar(input: Buffer): Promise<Buffer> {
  try {
    const image = sharp(input, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: "error",
    });

    const { format } = await image.metadata();
    if (!format || !ALLOWED_FORMATS.has(format)) {
      throw rejected("Please choose a JPG, PNG or WebP image.");
    }

    return await image
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Corrupt, truncated, or too large once decoded.
    throw rejected("We couldn't read that image. Please try another one.");
  }
}
