import "server-only";

import sharp, { type Sharp } from "sharp";

import { ApiError } from "@/server/http/api-error";

/** Decoded size limit (width x height), so a tiny file that expands into a huge image cannot exhaust memory. */
const MAX_INPUT_PIXELS = 25_000_000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export function rejectedImage(message: string): ApiError {
  return new ApiError("validation_failed", {
    message,
    fields: { photo: message },
  });
}

/**
 * Checks that an upload really is a JPG, PNG or WebP picture and re-encodes it
 * as WebP, after `shape` has resized it. What the file claims to be (its name
 * or type) is ignored: only what the image decoder finds counts. Re-encoding
 * also removes everything hidden in the original (GPS location, camera
 * details, embedded scripts or other payloads) and applies the phone's
 * rotation, so the stored file is only pixels.
 */
export async function processImage(
  input: Buffer,
  shape: (image: Sharp) => Sharp,
): Promise<Buffer> {
  try {
    const image = sharp(input, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: "error",
    });

    const { format } = await image.metadata();
    if (!format || !ALLOWED_FORMATS.has(format)) {
      throw rejectedImage("Please choose a JPG, PNG or WebP image.");
    }

    return await shape(image.rotate()).webp({ quality: 82 }).toBuffer();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Corrupt, truncated, or too large once decoded.
    throw rejectedImage("We couldn't read that image. Please try another one.");
  }
}
