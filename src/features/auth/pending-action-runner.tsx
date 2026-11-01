"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { toast } from "@/components/ui/toaster";
import { AuthError } from "@/features/auth/auth-service";
import { takePendingAction } from "@/features/auth/pending-action";
import { addCartItem } from "@/features/cart/cart-service";
import { cartQueryKey } from "@/features/cart/use-cart";
import { WISHLIST_KEY } from "@/features/wishlist/use-wishlist";
import { addToWishlist } from "@/features/wishlist/wishlist-service";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";

// The cart and wishlist used to be kept in the browser. They live on the server now.
const OLD_BROWSER_KEYS = ["luzanika-cart", "luzanika-wishlist"];

/**
 * Finishes what a visitor tried before logging in ("Add to cart", "Add to
 * wishlist"): once they are signed in, it is done for them. Also removes the
 * old browser copies of the cart and wishlist. Renders nothing.
 */
export function PendingActionRunner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);

  useEffect(() => {
    try {
      for (const key of OLD_BROWSER_KEYS) window.localStorage.removeItem(key);
    } catch {
      // Storage is blocked; there is nothing to clean up.
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    // Taking it removes it, so it runs once even if this effect runs twice.
    const action = takePendingAction();
    if (!action) return;

    const fail = (error: unknown, fallback: string) =>
      toast.error(
        error instanceof AuthError && error.serverMessage
          ? error.serverMessage
          : fallback,
      );

    if (action.kind === "cart") {
      const region = useUiStore.getState().region;
      addCartItem({
        variantId: action.variantId,
        quantity: action.quantity,
        market: region,
      })
        .then((items) => {
          queryClient.setQueryData(cartQueryKey(userId, region), items);
          toast.success(`${action.name || "The item"} was added to your cart`, {
            id: "cart-add",
            action: { label: "View cart", onClick: () => router.push("/cart") },
          });
        })
        .catch((error) =>
          fail(error, "We couldn't add that to your cart. Please try again."),
        );
      return;
    }

    addToWishlist(action.productId)
      .then((items) => {
        queryClient.setQueryData([WISHLIST_KEY, userId], items);
        toast.success(
          `${action.name || "The product"} was added to your wishlist`,
          {
            id: "wishlist-add",
            action: { label: "View", onClick: () => router.push("/wishlist") },
          },
        );
      })
      .catch((error) =>
        fail(
          error,
          "We couldn't save that to your wishlist. Please try again.",
        ),
      );
  }, [userId, queryClient, router]);

  return null;
}
