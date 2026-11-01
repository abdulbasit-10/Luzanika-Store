import { withKnownErrors } from "@/features/auth/auth-service";
import { apiDelete, apiGet, apiPost } from "@/lib/api-client";
import type { ProductSummary } from "@/types/product";

/** A saved product: the card details the page needs, plus when it was saved. */
export type WishlistItem = ProductSummary & {
  /** ISO 8601. */
  addedAt: string;
};

/** What the heart buttons know about a product. */
export type WishlistProduct = Pick<
  ProductSummary,
  "id" | "slug" | "name" | "image" | "prices"
>;

interface WishlistResponse {
  items: WishlistItem[];
}

/** GET /wishlist: newest first. */
export async function fetchWishlist(): Promise<WishlistItem[]> {
  const { items } = await withKnownErrors(() =>
    apiGet<WishlistResponse>("/wishlist"),
  );
  return items;
}

/** POST /wishlist/items: saving a product that is already saved is fine. */
export async function addToWishlist(
  productId: string,
): Promise<WishlistItem[]> {
  const { items } = await apiPost<WishlistResponse>("/wishlist/items", {
    productId,
  });
  return items;
}

/** DELETE /wishlist/items/:productId */
export async function removeFromWishlist(
  productId: string,
): Promise<WishlistItem[]> {
  const { items } = await apiDelete<WishlistResponse>(
    `/wishlist/items/${encodeURIComponent(productId)}`,
  );
  return items;
}
