import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { confirmOrderPayment } from "@/server/services/admin-payment-service";
import { confirmPaymentSchema } from "@/server/validation/admin-order-schemas";

/**
 * POST /api/v1/admin/orders/:number/payment/confirm { note? }: the money is
 * there. For cash on delivery: the cash was collected (the payment becomes
 * paid; the order is already with staff). For bank transfer, Easypaisa and
 * JazzCash: staff saw the money, so the order's stock is sold and it goes to
 * "processing"; the customer is emailed. See `paymentActions.canConfirm` of
 * the order. Needs "payments.verify".
 */
export const POST = staffRoute<{ number: string }>(
  {
    name: "admin.orders.payment_confirm",
    permission: "payments.verify",
    rateLimit: { limit: 120, windowSec: 10 * 60 },
  },
  async ({ json: readJson, params, admin }) =>
    json({
      order: await confirmOrderPayment(
        admin,
        params.number,
        await readJson(confirmPaymentSchema),
      ),
    }),
);
