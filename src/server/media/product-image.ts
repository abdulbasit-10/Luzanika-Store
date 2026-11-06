import "server-only";

import { processImage } from "./process-image";

export const PRODUCT_PHOTO_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
/** Longest side of a stored product photo. Smaller pictures are not enlarged. */
export const PRODUCT_PHOTO_MAX_SIDE = 1600;
export const MAX_PHOTOS_PER_PRODUCT = 5;

/** Turns an uploaded picture into a WebP of at most 1600 px on its longest side (see processImage). */
export function processProductPhoto(input: Buffer): Promise<Buffer> {
  return processImage(input, (image) =>
    image.resize(PRODUCT_PHOTO_MAX_SIDE, PRODUCT_PHOTO_MAX_SIDE, {
      fit: "inside",
      withoutEnlargement: true,
    }),
  );
}
