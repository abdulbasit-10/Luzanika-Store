"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { toast } from "@/components/ui/toaster";
import { AuthError } from "@/features/auth/auth-service";
import { savePendingAction } from "@/features/auth/pending-action";
import { useHandleSessionExpired } from "@/features/auth/use-session";
import {
  addCartItem,
  fetchCart,
  isBuyable,
  removeCartItem,
  removeSelectedCartItems,
  updateCartItem,
  type CartLine,
} from "@/features/cart/cart-service";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import type { RegionCode } from "@/types/region";

/** Cache key prefix for the cart. Cleared on sign out. */
export const CART_KEY = "cart";

export function cartQueryKey(userId: string | null, region: RegionCode) {
  return [CART_KEY, userId, region] as const;
}

const NO_LINES: CartLine[] = [];
const CART_MUTATION = ["cart-change"] as const;

/** The message to show for a failed change: the server's own words when it gave them. */
function explain(error: unknown, fallback: string) {
  if (error instanceof AuthError && error.serverMessage) {
    return error.serverMessage;
  }
  return fallback;
}

/**
 * The signed-in customer's cart, kept on the server. It is read for the
 * selected region, so prices and stock are always the live ones. The cache key
 * includes the customer's id, so on a shared device one customer's cart is
 * never shown to the next. Visitors who are not signed in have no cart: adding
 * an item asks them to log in, and remembers the item to add once they have.
 */
export function useCart() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const handleSessionExpired = useHandleSessionExpired();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const region = useUiStore((state) => state.region);
  const key = cartQueryKey(userId, region);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        return await fetchCart(region);
      } catch (error) {
        handleSessionExpired(error);
        throw error;
      }
    },
    enabled: userId !== null,
    // Stock changes while people shop, so a cart is re-read when the tab regains focus.
    staleTime: 30_000,
    retry: 1,
  });

  const lines = query.data ?? NO_LINES;

  /**
   * After a change, show the server's answer. If another change is still on
   * its way, wait: its answer will be the newer one.
   */
  const settle = (items: CartLine[]) => {
    if (queryClient.isMutating({ mutationKey: CART_MUTATION }) <= 1) {
      queryClient.setQueryData(key, items);
    }
  };

  const failed = (error: unknown, fallback: string) => {
    if (handleSessionExpired(error)) return;
    toast.error(explain(error, fallback), { id: "cart-error" });
    // The page may be showing something the change was based on; read the truth again.
    void queryClient.invalidateQueries({ queryKey: key });
  };

  /** Shows a change on screen before the server confirms it. */
  const showNow = (change: (current: CartLine[]) => CartLine[]) => {
    const current = queryClient.getQueryData<CartLine[]>(key);
    if (current) queryClient.setQueryData(key, change(current));
  };

  const add = useMutation({
    mutationKey: CART_MUTATION,
    mutationFn: (input: { variantId: string; quantity: number }) =>
      addCartItem({ ...input, market: region }),
    onSuccess: settle,
  });

  const change = useMutation({
    mutationKey: CART_MUTATION,
    mutationFn: ({
      variantId,
      ...changes
    }: {
      variantId: string;
      quantity?: number;
      selected?: boolean;
    }) => updateCartItem(variantId, { market: region, ...changes }),
    onMutate: async ({ variantId, quantity, selected }) => {
      await queryClient.cancelQueries({ queryKey: key });
      showNow((current) =>
        current.map((line) => {
          if (line.variantId !== variantId) return line;
          return {
            ...line,
            ...(quantity !== undefined
              ? {
                  quantity: Math.min(quantity, line.available),
                  requestedQuantity: quantity,
                  status: (quantity > line.available
                    ? "adjusted"
                    : "ok") as CartLine["status"],
                }
              : {}),
            ...(selected !== undefined
              ? { selected: selected && isBuyable(line) }
              : {}),
          };
        }),
      );
    },
    onSuccess: settle,
    onError: (error) => failed(error, "Couldn't update your cart."),
  });

  const remove = useMutation({
    mutationKey: CART_MUTATION,
    mutationFn: (variantId: string) => removeCartItem(variantId, region),
    onMutate: async (variantId) => {
      await queryClient.cancelQueries({ queryKey: key });
      showNow((current) =>
        current.filter((line) => line.variantId !== variantId),
      );
    },
    onSuccess: settle,
    onError: (error) => failed(error, "Couldn't remove that item."),
  });

  const removeSelected = useMutation({
    mutationKey: CART_MUTATION,
    mutationFn: () => removeSelectedCartItems(region),
    onSuccess: settle,
    onError: (error) => failed(error, "Couldn't update your cart."),
  });

  /**
   * Adds the item and returns true. Returns false (after telling the visitor
   * why) when they are not signed in or the item cannot be added.
   */
  async function addItem(item: {
    variantId: string;
    quantity: number;
    name: string;
  }) {
    if (!userId) {
      savePendingAction({ kind: "cart", ...item });
      const next = window.location.pathname + window.location.search;
      toast.info("Log in to add items to your cart.", {
        id: "cart-login",
        action: {
          label: "Log in",
          onClick: () => router.push(`/login?next=${encodeURIComponent(next)}`),
        },
      });
      return false;
    }
    try {
      await add.mutateAsync({
        variantId: item.variantId,
        quantity: item.quantity,
      });
      return true;
    } catch (error) {
      if (!handleSessionExpired(error)) {
        toast.error(explain(error, "Couldn't add that to your cart."), {
          id: "cart-error",
        });
      }
      // The stock the page showed may be out of date.
      void queryClient.invalidateQueries({ queryKey: key });
      return false;
    }
  }

  return {
    lines,
    signedIn: userId !== null,
    /** True while the cart is first being read. */
    isLoading: userId !== null && query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    addItem,
    setQuantity: (variantId: string, quantity: number) =>
      change.mutate({ variantId, quantity }),
    toggleSelected: (variantId: string, selected: boolean) =>
      change.mutate({ variantId, selected }),
    removeItem: (variantId: string) => remove.mutate(variantId),
    removeSelected: () => removeSelected.mutate(),
  };
}
