import "server-only";

import { processImage } from "./process-image";

export const AVATAR_SIZE = 256;
export const AVATAR_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Turns an uploaded picture into a small square WebP (see processImage). */
export function processAvatar(input: Buffer): Promise<Buffer> {
  return processImage(input, (image) =>
    image.resize(AVATAR_SIZE, AVATAR_SIZE, {
      fit: "cover",
      position: "centre",
    }),
  );
}
