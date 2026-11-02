import { staffRoute } from "@/server/auth/staff-route";
import { created } from "@/server/http/responses";
import { refundOrder } from "@/server/services/admin-order-service";
import { createRefundSchema } from "@/server/validation/admin-order-schemas";

/**
 * POST /api/v1/admin/orders/:number/refunds { amount, reason, restock?, items? }
 * records a refund for a paid order. `amount` is in minor units and may not be
 * more than what is still refundable (see `amounts.refundableTotal` of the
 * order). A full refund ends the order as "refunded": this is how a paid order
 * is cancelled. With `restock: true` the returned items go back into stock:
 * list them in `items` ({ orderItemId, quantity }), or leave `items` out to put
 * back everything that is not back yet. No money moves until a payment
 * provider exists.
 */
export const POST = staffRoute<{ number: string }>(
  {
    name: "admin.orders.refund",
    permission: "orders.refund",
    rateLimit: { limit: 60, windowSec: 10 * 60 },
  },
  async ({ json: readJson, params, admin }) => {
    const order = await refundOrder(
      admin,
      params.number,
      await readJson(createRefundSchema),
    );
    return created(
      { order },
      `/api/v1/admin/orders/${encodeURIComponent(order.number)}`,
    );
  },
);
