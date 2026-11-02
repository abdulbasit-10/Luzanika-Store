import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ConfirmedOrder } from "@/features/orders/types";

interface OrderHistoryState {
  /** One list per signed-in user, newest first. */
  byUser: Record<string, ConfirmedOrder[]>;
  add: (userId: string, order: ConfirmedOrder) => void;
}

/*
 * Mock order history, kept in the browser until the backend has GET /orders
 * for the signed-in user. Orders are saved when they are placed; visitors who
 * check out without an account get no history (the backend will email them).
 */
export const useOrderHistoryStore = create<OrderHistoryState>()(
  persist(
    (set) => ({
      byUser: {},

      add: (userId, order) =>
        set(({ byUser }) => {
          const orders = byUser[userId] ?? [];
          if (orders.some((item) => item.code === order.code)) return {};
          return { byUser: { ...byUser, [userId]: [order, ...orders] } };
        }),
    }),
    {
      name: "luzanika-orders",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ byUser }) => ({ byUser }),
    },
  ),
);
