import { customerRoute } from "@/server/auth/customer-route";
import { json } from "@/server/http/responses";
import { getWishlist } from "@/server/services/wishlist-service";

/** GET /api/v1/wishlist: the signed-in customer's saved products, newest first. */
export const GET = customerRoute(
  { name: "wishlist.get" },
  async ({ customer }) => json({ items: await getWishlist(customer.id) }),
);
