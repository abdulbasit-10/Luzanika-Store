import { customerRoute } from "@/server/auth/customer-route";
import { json } from "@/server/http/responses";
import { cancelOrder } from "@/server/services/order-service";

/** POST /api/v1/orders/:number/cancel: cancels an order that has not been paid yet and gives its stock back. */
export const POST = customerRoute<{ number: string }>(
  { name: "orders.cancel", rateLimit: { limit: 30, windowSec: 10 * 60 } },
  async ({ customer, params }) =>
    json({ order: await cancelOrder(customer.id, params.number) }),
);
