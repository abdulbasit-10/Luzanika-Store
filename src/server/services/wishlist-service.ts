import "server-only";

import { toSummary } from "@/server/catalog/map-catalog";
import { withTransaction } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import { catalogRepository } from "@/server/repositories/catalog-repository";
import { wishlistRepository } from "@/server/repositories/wishlist-repository";
import { productIdSchema } from "@/server/validation/cart-schemas";
import type { ProductSummary } from "@/types/product";

export const MAX_WISHLIST_ITEMS = 200;

export interface WishlistItemDto extends ProductSummary {
  /** When it was saved, ISO 8601. */
  addedAt: string;
}

function parseProductId(id: string): string {
  const parsed = productIdSchema.safeParse(id);
  if (!parsed.success) throw new ApiError("not_found");
  return parsed.data;
}

/** The saved products, newest first. A product that was hidden or deleted since is left out (but stays saved, in case it returns). */
async function readWishlist(customerId: string): Promise<WishlistItemDto[]> {
  const entries = await wishlistRepository.list(customerId);
  const rows = await catalogRepository.listProductsByIds(
    entries.map((entry) => entry.product_id),
  );
  const parts = await catalogRepository.listProductParts(
    rows.map((row) => row.id),
    { firstImageOnly: true },
  );
  const byId = new Map(rows.map((row) => [row.id, row]));

  return entries.flatMap((entry) => {
    const row = byId.get(entry.product_id);
    return row
      ? [
          {
            ...toSummary(row, parts),
            addedAt: new Date(entry.created_at).toISOString(),
          },
        ]
      : [];
  });
}

export function getWishlist(customerId: string): Promise<WishlistItemDto[]> {
  return readWishlist(customerId);
}

export function addToWishlist(
  customerId: string,
  rawProductId: string,
): Promise<WishlistItemDto[]> {
  const productId = parseProductId(rawProductId);

  return withTransaction(async (tx) => {
    await wishlistRepository.lockCustomer(customerId, tx);

    const [product] = await catalogRepository.listProductsByIds([productId]);
    if (!product) {
      throw new ApiError("not_found", {
        message: "This product is no longer available.",
      });
    }
    if (
      !(await wishlistRepository.has(customerId, productId, tx)) &&
      (await wishlistRepository.count(customerId, tx)) >= MAX_WISHLIST_ITEMS
    ) {
      throw new ApiError("unprocessable", {
        message: `Your wishlist can hold ${MAX_WISHLIST_ITEMS} products. Please remove one first.`,
      });
    }

    await wishlistRepository.add(customerId, productId, tx);
  }).then(() => readWishlist(customerId));
}

/** Removing a product that is not saved is fine: the goal ("it is not on the list") is met. */
export function removeFromWishlist(
  customerId: string,
  rawProductId: string,
): Promise<WishlistItemDto[]> {
  const productId = parseProductId(rawProductId);

  return withTransaction((tx) =>
    wishlistRepository.remove(customerId, productId, tx),
  ).then(() => readWishlist(customerId));
}
