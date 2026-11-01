import { customerRoute } from "@/server/auth/customer-route";
import { created } from "@/server/http/responses";
import { addToWishlist } from "@/server/services/wishlist-service";
import { wishlistProductSchema } from "@/server/validation/cart-schemas";

/** POST /api/v1/wishlist/items: saves a product. Saving one that is already saved is fine. */
export const POST = customerRoute(
  { name: "wishlist.add", rateLimit: { limit: 120, windowSec: 10 * 60 } },
  async ({ json: readJson, customer }) => {
    const { productId } = await readJson(wishlistProductSchema);
    return created(
      { items: await addToWishlist(customer.id, productId) },
      `/api/v1/wishlist/items/${productId}`,
    );
  },
);
