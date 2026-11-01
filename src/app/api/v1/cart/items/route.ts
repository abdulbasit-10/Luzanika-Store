import { customerRoute } from "@/server/auth/customer-route";
import { created } from "@/server/http/responses";
import { addToCart } from "@/server/services/cart-service";
import { addCartItemSchema } from "@/server/validation/cart-schemas";

/**
 * POST /api/v1/cart/items: adds a variant (or raises its quantity). Refused with
 * 409 out_of_stock when the total would be more than is available.
 */
export const POST = customerRoute(
  { name: "cart.add", rateLimit: { limit: 120, windowSec: 10 * 60 } },
  async ({ json: readJson, customer }) => {
    const body = await readJson(addCartItemSchema);
    const items = await addToCart(customer.id, body);
    return created(
      { market: body.market, items },
      `/api/v1/cart/items/${body.variantId}`,
    );
  },
);
