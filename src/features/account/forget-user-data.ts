import { useAddressStore } from "@/stores/address-store";
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
 * Removes everything this browser kept for a customer: cart, wishlist, saved
 * addresses and order history. Used when the account is deleted, so personal
 * details (a home address, for example) do not stay on the device afterwards.
 * Other customers' data on the same device is left alone.
 */
export function forgetUserData(userId: string) {
  useCartStore.setState(({ byUser }) => ({ byUser: without(byUser, userId) }));
  useWishlistStore.setState(({ byUser }) => ({
    byUser: without(byUser, userId),
  }));
  useAddressStore.setState(({ byUser }) => ({
    byUser: without(byUser, userId),
  }));
  useOrderHistoryStore.setState(({ byUser }) => ({
    byUser: without(byUser, userId),
  }));
  useOrderStore.setState({ lastOrder: null });
}
