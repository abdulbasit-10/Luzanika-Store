import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ProductImage } from "@/types/product";
import type { RegionalPrice } from "@/types/region";

/** What the product page sends when a shopper adds a product. */
export interface CartItemInput {
  productId: string;
  slug: string;
  name: string;
  image?: ProductImage;
  prices: RegionalPrice[];
  /** Short descriptors such as scent notes; shown instead of the size. */
  notes?: string[];
  color?: string;
  size?: string;
  /** Most the shopper can buy (stock). */
  maxQuantity: number;
}

export interface CartLine extends CartItemInput {
  /** One line per product + color + size. */
  key: string;
  quantity: number;
  /** Only selected lines count towards the totals and checkout. */
  selected: boolean;
}

interface CartState {
  /** Each signed-in customer's own cart, by user id. */
  byUser: Record<string, CartLine[]>;
  addItem: (userId: string, item: CartItemInput, quantity?: number) => void;
  setQuantity: (userId: string, key: string, quantity: number) => void;
  toggleSelected: (userId: string, key: string) => void;
  removeItem: (userId: string, key: string) => void;
  /** Removes the selected lines, e.g. after they were paid for. */
  removeSelected: (userId: string) => void;
}

export function getLineKey({
  productId,
  color,
  size,
}: Pick<CartItemInput, "productId" | "color" | "size">) {
  return [productId, color ?? "", size ?? ""].join("::");
}

/** Applies a change to one customer's lines without touching anyone else's cart. */
function updateLines(
  byUser: Record<string, CartLine[]>,
  userId: string,
  change: (lines: CartLine[]) => CartLine[],
) {
  return { byUser: { ...byUser, [userId]: change(byUser[userId] ?? []) } };
}

/**
 * Version 1 was one shared guest cart. Guests can no longer have a cart, so
 * it is dropped rather than handed to whoever signs in first.
 */
export function migrateCartState(): { byUser: Record<string, CartLine[]> } {
  return { byUser: {} };
}

/**
 * Each customer's cart, kept in this browser (localStorage) under their user
 * id, so two people sharing a device never see each other's items. Only
 * signed-in customers have a cart. Product details are saved when an item is
 * added; the backend will re-price and validate them. Once the cart API exists
 * the cart is stored on the server and this store goes away.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      byUser: {},

      addItem: (userId, item, quantity = 1) =>
        set(({ byUser }) =>
          updateLines(byUser, userId, (lines) => {
            const key = getLineKey(item);
            const existing = lines.find((line) => line.key === key);

            if (existing) {
              return lines.map((line) =>
                line.key === key
                  ? {
                      ...line,
                      maxQuantity: item.maxQuantity,
                      quantity: Math.min(
                        item.maxQuantity,
                        line.quantity + quantity,
                      ),
                    }
                  : line,
              );
            }

            return [
              ...lines,
              {
                ...item,
                key,
                quantity: Math.min(item.maxQuantity, Math.max(1, quantity)),
                selected: true,
              },
            ];
          }),
        ),

      setQuantity: (userId, key, quantity) =>
        set(({ byUser }) =>
          updateLines(byUser, userId, (lines) =>
            lines.map((line) =>
              line.key === key
                ? {
                    ...line,
                    quantity: Math.min(line.maxQuantity, Math.max(1, quantity)),
                  }
                : line,
            ),
          ),
        ),

      toggleSelected: (userId, key) =>
        set(({ byUser }) =>
          updateLines(byUser, userId, (lines) =>
            lines.map((line) =>
              line.key === key ? { ...line, selected: !line.selected } : line,
            ),
          ),
        ),

      removeItem: (userId, key) =>
        set(({ byUser }) =>
          updateLines(byUser, userId, (lines) =>
            lines.filter((line) => line.key !== key),
          ),
        ),

      removeSelected: (userId) =>
        set(({ byUser }) =>
          updateLines(byUser, userId, (lines) =>
            lines.filter((line) => !line.selected),
          ),
        ),
    }),
    {
      name: "luzanika-cart",
      version: 2,
      migrate: migrateCartState,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ byUser }) => ({ byUser }),
    },
  ),
);
