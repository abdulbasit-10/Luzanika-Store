import { useOrderHistoryStore } from "@/stores/order-history-store";
import { useOrderStore } from "@/stores/order-store";

function without<T>(byUser: Record<string, T>, userId: string) {
  return Object.fromEntries(
    Object.entries(byUser).filter(([id]) => id !== userId),
  );
}

/**
 * Removes everything this browser still keeps for a customer: order history
 * (until orders move to the server). Used when the account is deleted, so
 * personal details do not stay on the device afterwards. Other customers'
 * data on the same device is left alone. (Addresses, cart and wishlist live
 * on the server, which deletes them.)
 */
export function forgetUserData(userId: string) {
  useOrderHistoryStore.setState(({ byUser }) => ({
    byUser: without(byUser, userId),
  }));
  useOrderStore.setState({ lastOrder: null });
}
