import { customerRoute } from "@/server/auth/customer-route";
import { json } from "@/server/http/responses";
import { readUploadForm } from "@/server/http/uploads";
import {
  PAYMENT_PROOF_FIELD,
  PAYMENT_PROOF_MAX_UPLOAD_BYTES,
} from "@/server/media/payment-proof-image";
import { submitPaymentProof } from "@/server/services/payment-proof-service";

/**
 * POST /api/v1/orders/:number/payment-proof: the customer says they paid an
 * order that is paid by bank transfer, Easypaisa or JazzCash. Multipart form:
 * "transactionId" (text, the ID the bank or wallet app shows) and/or
 * "screenshot" (JPG/PNG/WebP up to 6 MB); at least one of the two. The order
 * then waits for staff to check it (payment status "awaiting_verification").
 * A rejected proof can be replaced with a new one.
 */
export const POST = customerRoute<{ number: string }>(
  {
    name: "orders.payment_proof",
    rateLimit: { limit: 30, windowSec: 60 * 60 },
  },
  async ({ request, customer, params, rateLimit }) => {
    // Re-encoding a picture is expensive, so it is limited per account too.
    rateLimit({
      name: "orders.payment_proof",
      key: customer.id,
      limit: 10,
      windowSec: 60 * 60,
    });

    const { file, fields } = await readUploadForm(request, {
      fileField: PAYMENT_PROOF_FIELD,
      textFields: ["transactionId"],
      maxBytes: PAYMENT_PROOF_MAX_UPLOAD_BYTES,
    });
    return json({
      order: await submitPaymentProof(customer.id, params.number, {
        fields,
        screenshot: file,
      }),
    });
  },
);
