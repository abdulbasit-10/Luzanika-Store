import { customerRoute } from "@/server/auth/customer-route";
import { json } from "@/server/http/responses";
import { getOrder } from "@/server/services/order-service";

/** GET /api/v1/orders/:number: one of the customer's own orders. Anyone else's is "not found". */
export const GET = customerRoute<{ number: string }>(
  { name: "orders.get" },
  async ({ customer, params }) =>
    json({ order: await getOrder(customer.id, params.number) }),
);
