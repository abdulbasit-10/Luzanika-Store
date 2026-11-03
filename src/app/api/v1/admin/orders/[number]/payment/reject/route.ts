import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { rejectOrderPayment } from "@/server/services/admin-payment-service";
import { rejectPaymentSchema } from "@/server/validation/admin-order-schemas";

/**
 * POST /api/v1/admin/orders/:number/payment/reject { reason }: the customer's
 * payment proof does not check out. The reason is emailed to the customer and
 * shown on their order, they can send another proof, and the order keeps its
 * stock for a fresh hold time. Only while a proof waits for a decision (see
 * `paymentActions.canReject` of the order). Needs "payments.verify".
 */
export const POST = staffRoute<{ number: string }>(
  {
    name: "admin.orders.payment_reject",
    permission: "payments.verify",
    rateLimit: { limit: 120, windowSec: 10 * 60 },
  },
  async ({ json: readJson, params, admin }) =>
    json({
      order: await rejectOrderPayment(
        admin,
        params.number,
        await readJson(rejectPaymentSchema),
      ),
    }),
);
