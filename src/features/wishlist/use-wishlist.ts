"use client";

import { useRouter } from "next/navigation";

import { toast } from "@/components/ui/toaster";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAuthStore } from "@/stores/auth-store";
import {
  useWishlistStore,
  type WishlistItem,
  type WishlistProduct,
} from "@/stores/wishlist-store";

const NO_ITEMS: WishlistItem[] = [];

/**
 * The signed-in user's wishlist. Visitors who are not signed in cannot save
 * items: toggling asks them to log in and brings them back to this page.
 */
export function useWishlist() {
  const router = useRouter();
  const hydrated = useHydrated();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const saved = useWishlistStore((state) =>
    userId ? state.byUser[userId] : undefined,
  );
  const add = useWishlistStore((state) => state.add);
  const remove = useWishlistStore((state) => state.remove);

  const items = hydrated && saved ? saved : NO_ITEMS;

  function toggle(product: WishlistProduct) {
    if (!userId) {
      const next = window.location.pathname + window.location.search;
      toast.info("Log in to save items to your wishlist.", {
        id: "wishlist-login",
        action: {
          label: "Log in",
          onClick: () => router.push(`/login?next=${encodeURIComponent(next)}`),
        },
      });
      return;
    }

    const existing = items.find((item) => item.id === product.id);
    if (existing) {
      remove(userId, product.id);
      toast(`${product.name} removed from your wishlist`, {
        id: `wishlist-${product.id}`,
        action: {
          label: "Undo",
          onClick: () => add(userId, product, existing.addedAt),
        },
      });
      return;
    }

    add(userId, product);
    toast.success(`${product.name} added to your wishlist`, {
      id: `wishlist-${product.id}`,
      action: { label: "View", onClick: () => router.push("/wishlist") },
    });
  }

  return {
    items,
    has: (productId: string) => items.some((item) => item.id === productId),
    toggle,
  };
}
