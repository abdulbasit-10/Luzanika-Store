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
  lines: CartLine[];
  addItem: (item: CartItemInput, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  toggleSelected: (key: string) => void;
  removeItem: (key: string) => void;
}

export function getLineKey({
  productId,
  color,
  size,
}: Pick<CartItemInput, "productId" | "color" | "size">) {
  return [productId, color ?? "", size ?? ""].join("::");
}

/**
 * Guest cart, kept in the browser (localStorage). Product details are saved
 * when an item is added; the backend will re-price and validate them. Once the
 * Express cart API exists, logged-in shoppers use it instead and this store
 * becomes the guest fallback.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],

      addItem: (item, quantity = 1) =>
        set(({ lines }) => {
          const key = getLineKey(item);
          const existing = lines.find((line) => line.key === key);

          if (existing) {
            return {
              lines: lines.map((line) =>
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
              ),
            };
          }

          return {
            lines: [
              ...lines,
              {
                ...item,
                key,
                quantity: Math.min(item.maxQuantity, Math.max(1, quantity)),
                selected: true,
              },
            ],
          };
        }),

      setQuantity: (key, quantity) =>
        set(({ lines }) => ({
          lines: lines.map((line) =>
            line.key === key
              ? {
                  ...line,
                  quantity: Math.min(line.maxQuantity, Math.max(1, quantity)),
                }
              : line,
          ),
        })),

      toggleSelected: (key) =>
        set(({ lines }) => ({
          lines: lines.map((line) =>
            line.key === key ? { ...line, selected: !line.selected } : line,
          ),
        })),

      removeItem: (key) =>
        set(({ lines }) => ({
          lines: lines.filter((line) => line.key !== key),
        })),
    }),
    {
      name: "luzanika-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ lines }) => ({ lines }),
    },
  ),
);
