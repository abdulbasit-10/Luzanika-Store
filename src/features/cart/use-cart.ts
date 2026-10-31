"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { toast } from "@/components/ui/toaster";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAuthStore } from "@/stores/auth-store";
import {
  useCartStore,
  type CartItemInput,
  type CartLine,
} from "@/stores/cart-store";

const NO_LINES: CartLine[] = [];

/**
 * The signed-in customer's own cart. Visitors who are not signed in have no
 * cart: adding an item asks them to log in and brings them back to this page.
 */
export function useCart() {
  const router = useRouter();
  const hydrated = useHydrated();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const saved = useCartStore((state) =>
    userId ? state.byUser[userId] : undefined,
  );
  const add = useCartStore((state) => state.addItem);
  const set = useCartStore((state) => state.setQuantity);
  const toggle = useCartStore((state) => state.toggleSelected);
  const remove = useCartStore((state) => state.removeItem);
  const removeSel = useCartStore((state) => state.removeSelected);

  const lines = hydrated && saved ? saved : NO_LINES;

  /** Adds the item and returns true, or asks the visitor to log in and returns false. */
  const addItem = useCallback(
    (item: CartItemInput, quantity?: number) => {
      if (!userId) {
        const next = window.location.pathname + window.location.search;
        toast.info("Log in to add items to your cart.", {
          id: "cart-login",
          action: {
            label: "Log in",
            onClick: () =>
              router.push(`/login?next=${encodeURIComponent(next)}`),
          },
        });
        return false;
      }
      add(userId, item, quantity);
      return true;
    },
    [add, router, userId],
  );

  return {
    lines,
    signedIn: userId !== null,
    addItem,
    setQuantity: (key: string, quantity: number) => {
      if (userId) set(userId, key, quantity);
    },
    toggleSelected: (key: string) => {
      if (userId) toggle(userId, key);
    },
    removeItem: (key: string) => {
      if (userId) remove(userId, key);
    },
    removeSelected: () => {
      if (userId) removeSel(userId);
    },
  };
}
