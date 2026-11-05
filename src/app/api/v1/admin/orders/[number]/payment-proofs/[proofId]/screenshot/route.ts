import { NextResponse } from "next/server";

import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { getPaymentScreenshot } from "@/server/services/admin-payment-service";

/**
 * GET /api/v1/admin/orders/:number/payment-proofs/:proofId/screenshot: the
 * screenshot a customer sent as proof of a transfer. Private: only staff with
 * "payments.verify" can see it, and browsers and proxies may not keep a copy.
 */
export const GET = staffRoute<{ number: string; proofId: string }>(
  {
    name: "admin.orders.payment_screenshot",
    permission: "payments.verify",
    rateLimit: { limit: 300, windowSec: 10 * 60 },
  },
  async ({ params }) => {
    const file = await getPaymentScreenshot(
      params.number,
      uuidParam(params.proofId),
    );
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
);
