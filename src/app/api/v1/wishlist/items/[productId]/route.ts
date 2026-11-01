import { customerRoute } from "@/server/auth/customer-route";
import { json } from "@/server/http/responses";
import { removeFromWishlist } from "@/server/services/wishlist-service";

/** DELETE /api/v1/wishlist/items/:productId: removes a product from the list. */
export const DELETE = customerRoute<{ productId: string }>(
  { name: "wishlist.remove", rateLimit: { limit: 120, windowSec: 10 * 60 } },
  async ({ customer, params }) =>
    json({ items: await removeFromWishlist(customer.id, params.productId) }),
);
