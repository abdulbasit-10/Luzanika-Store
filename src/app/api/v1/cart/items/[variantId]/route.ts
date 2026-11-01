import { customerRoute } from "@/server/auth/customer-route";
import { json } from "@/server/http/responses";
import { removeCartItem, updateCartItem } from "@/server/services/cart-service";
import {
  marketQuerySchema,
  updateCartItemSchema,
} from "@/server/validation/cart-schemas";

const limit = { limit: 240, windowSec: 10 * 60 };

/** PATCH /api/v1/cart/items/:variantId: changes the quantity and/or whether the line is ticked. */
export const PATCH = customerRoute<{ variantId: string }>(
  { name: "cart.update", rateLimit: limit },
  async ({ json: readJson, customer, params }) => {
    const body = await readJson(updateCartItemSchema);
    const items = await updateCartItem(customer.id, params.variantId, body);
    return json({ market: body.market, items });
  },
);

/** DELETE /api/v1/cart/items/:variantId?market=PK|DE: removes the line. */
export const DELETE = customerRoute<{ variantId: string }>(
  { name: "cart.remove", rateLimit: limit },
  async ({ customer, params, query }) => {
    const { market } = query(marketQuerySchema);
    const items = await removeCartItem(customer.id, params.variantId, market);
    return json({ market, items });
  },
);
