"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { toast } from "@/components/ui/toaster";
import { AuthError } from "@/features/auth/auth-service";
import { savePendingAction } from "@/features/auth/pending-action";
import { useHandleSessionExpired } from "@/features/auth/use-session";
import {
  addToWishlist,
  fetchWishlist,
  removeFromWishlist,
  type WishlistItem,
  type WishlistProduct,
} from "@/features/wishlist/wishlist-service";
import { useAuthStore } from "@/stores/auth-store";

/** Cache key prefix for the wishlist. Cleared on sign out. */
export const WISHLIST_KEY = "wishlist";

const NO_ITEMS: WishlistItem[] = [];
const WISHLIST_MUTATION = ["wishlist-change"] as const;

/**
 * The signed-in user's wishlist, kept on the server. The cache key includes
 * the user's id, so on a shared device one person's list is never shown to the
 * next. Visitors who are not signed in cannot save items: tapping the heart
 * asks them to log in, and remembers the product to save once they have.
 */
export function useWishlist() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const handleSessionExpired = useHandleSessionExpired();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const key = [WISHLIST_KEY, userId] as const;

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        return await fetchWishlist();
      } catch (error) {
        handleSessionExpired(error);
        throw error;
      }
    },
    enabled: userId !== null,
    staleTime: 60_000,
    retry: 1,
  });

  const items = query.data ?? NO_ITEMS;

  const settle = (next: WishlistItem[]) => {
    // If another change is still on its way, its answer will be the newer one.
    if (queryClient.isMutating({ mutationKey: WISHLIST_MUTATION }) <= 1) {
      queryClient.setQueryData(key, next);
    }
  };

  const failed = (error: unknown, fallback: string) => {
    if (handleSessionExpired(error)) return;
    toast.error(
      error instanceof AuthError && error.serverMessage
        ? error.serverMessage
        : fallback,
      { id: "wishlist-error" },
    );
    void queryClient.invalidateQueries({ queryKey: key });
  };

  const save = useMutation({
    mutationKey: WISHLIST_MUTATION,
    mutationFn: (product: WishlistProduct) => addToWishlist(product.id),
    onMutate: async (product) => {
      await queryClient.cancelQueries({ queryKey: key });
      const current = queryClient.getQueryData<WishlistItem[]>(key) ?? [];
      if (!current.some((item) => item.id === product.id)) {
        queryClient.setQueryData<WishlistItem[]>(key, [
          { ...product, addedAt: new Date().toISOString() },
          ...current,
        ]);
      }
    },
    onSuccess: settle,
    onError: (error) => failed(error, "Couldn't save that to your wishlist."),
  });

  const unsave = useMutation({
    mutationKey: WISHLIST_MUTATION,
    mutationFn: (productId: string) => removeFromWishlist(productId),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const current = queryClient.getQueryData<WishlistItem[]>(key);
      if (current) {
        queryClient.setQueryData(
          key,
          current.filter((item) => item.id !== productId),
        );
      }
    },
    onSuccess: settle,
    onError: (error) => failed(error, "Couldn't update your wishlist."),
  });

  function toggle(product: WishlistProduct) {
    if (!userId) {
      savePendingAction({
        kind: "wishlist",
        productId: product.id,
        name: product.name,
      });
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

    if (items.some((item) => item.id === product.id)) {
      unsave.mutate(product.id);
      toast(`${product.name} removed from your wishlist`, {
        id: `wishlist-${product.id}`,
        action: { label: "Undo", onClick: () => save.mutate(product) },
      });
      return;
    }

    save.mutate(product);
    toast.success(`${product.name} added to your wishlist`, {
      id: `wishlist-${product.id}`,
      action: { label: "View", onClick: () => router.push("/wishlist") },
    });
  }

  return {
    items,
    /** True while the list is first being read. */
    isLoading: userId !== null && query.isPending,
    has: (productId: string) => items.some((item) => item.id === productId),
    toggle,
  };
}
