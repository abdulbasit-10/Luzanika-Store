import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ProductSummary } from "@/types/product";

/** What the wishlist keeps about a product. The backend will return the live product instead. */
export type WishlistProduct = Pick<
  ProductSummary,
  "id" | "slug" | "name" | "image" | "prices"
>;

export interface WishlistItem extends WishlistProduct {
  /** Epoch milliseconds, newest first on the page. */
  addedAt: number;
}

interface WishlistState {
  /** One list per signed-in user, so accounts on the same browser do not share items. */
  byUser: Record<string, WishlistItem[]>;
  add: (userId: string, product: WishlistProduct, addedAt?: number) => void;
  remove: (userId: string, productId: string) => void;
}

/*
 * Mock wishlist, kept in the browser until the backend has wishlist endpoints
 * (GET/POST/DELETE /wishlist for the signed-in user). The hook that uses it
 * (use-wishlist) is the only place that changes then.
 */
export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      byUser: {},

      add: (userId, product, addedAt = Date.now()) =>
        set(({ byUser }) => {
          const items = byUser[userId] ?? [];
          if (items.some((item) => item.id === product.id)) return {};
          const { id, slug, name, image, prices } = product;
          return {
            byUser: {
              ...byUser,
              [userId]: [{ id, slug, name, image, prices, addedAt }, ...items],
            },
          };
        }),

      remove: (userId, productId) =>
        set(({ byUser }) => ({
          byUser: {
            ...byUser,
            [userId]: (byUser[userId] ?? []).filter(
              (item) => item.id !== productId,
            ),
          },
        })),
    }),
    {
      name: "luzanika-wishlist",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ byUser }) => ({ byUser }),
    },
  ),
);
