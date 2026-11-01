import { customerRoute } from "@/server/auth/customer-route";
import { ApiError } from "@/server/http/api-error";
import { created, json } from "@/server/http/responses";
import { createOrder, listOrders } from "@/server/services/order-service";
import {
  createOrderSchema,
  idempotencyKeySchema,
} from "@/server/validation/order-schemas";

/** GET /api/v1/orders: the signed-in customer's orders, newest first. */
export const GET = customerRoute(
  { name: "orders.list" },
  async ({ customer }) => json({ items: await listOrders(customer.id) }),
);

/**
 * POST /api/v1/orders: places an order for the ticked cart lines. The body has
 * no prices (the server prices everything) but says what the shopper saw
 * ("expected"); a mismatch is refused with 409 cart_changed. The optional
 * Idempotency-Key header makes a repeated request (double click, retry) return
 * the same order instead of making another.
 */
export const POST = customerRoute(
  { name: "orders.create", rateLimit: { limit: 20, windowSec: 10 * 60 } },
  async ({ json: readJson, customer, request }) => {
    const body = await readJson(createOrderSchema);

    const header = request.headers.get("idempotency-key");
    let key: string | null = null;
    if (header !== null) {
      const parsed = idempotencyKeySchema.safeParse(header);
      if (!parsed.success) {
        throw new ApiError("validation_failed", {
          message: "The Idempotency-Key header is not valid.",
        });
      }
      key = parsed.data;
    }

    const placed = await createOrder(customer, body, key);
    return created(placed, `/api/v1/orders/${placed.order.number}`);
  },
);
