import "server-only";

import { processImage } from "./process-image";

export const PAYMENT_PROOF_MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
/** Longest side of a stored screenshot: large enough to read the amount and the transaction ID. */
export const PAYMENT_PROOF_MAX_SIDE = 2000;
/** The upload field the screenshot is sent in. */
export const PAYMENT_PROOF_FIELD = "screenshot";

/** Turns an uploaded screenshot into a WebP of at most 2000 px on its longest side (see processImage). */
export function processPaymentProof(input: Buffer): Promise<Buffer> {
  return processImage(
    input,
    (image) =>
      image.resize(PAYMENT_PROOF_MAX_SIDE, PAYMENT_PROOF_MAX_SIDE, {
        fit: "inside",
        withoutEnlargement: true,
      }),
    PAYMENT_PROOF_FIELD,
  );
}
