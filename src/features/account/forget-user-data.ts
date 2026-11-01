import { useCartStore } from "@/stores/cart-store";
import { useOrderHistoryStore } from "@/stores/order-history-store";
import { useOrderStore } from "@/stores/order-store";
import { useWishlistStore } from "@/stores/wishlist-store";

function without<T>(byUser: Record<string, T>, userId: string) {
  return Object.fromEntries(
    Object.entries(byUser).filter(([id]) => id !== userId),
  );
}

/**
 * Removes everything this browser still keeps for a customer: cart, wishlist
 * and order history. Used when the account is deleted, so personal details do
 * not stay on the device afterwards. Other customers' data on the same device
 * is left alone. (Saved addresses live on the server, which deletes them.)
 */
export function forgetUserData(userId: string) {
  useCartStore.setState(({ byUser }) => ({ byUser: without(byUser, userId) }));
  useWishlistStore.setState(({ byUser }) => ({
    byUser: without(byUser, userId),
  }));
  useOrderHistoryStore.setState(({ byUser }) => ({
    byUser: without(byUser, userId),
  }));
  useOrderStore.setState({ lastOrder: null });
}
