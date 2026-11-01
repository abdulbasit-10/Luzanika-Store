import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ConfirmedOrder } from "@/features/orders/types";

interface OrderState {
  lastOrder: ConfirmedOrder | null;
  setLastOrder: (order: ConfirmedOrder) => void;
}

/**
 * The order that was just placed, for the confirmation page. It lives in
 * sessionStorage, so a reload keeps it but a new tab does not. Once the backend
 * exists the page fetches the order by id instead and this store goes away.
 */
export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      lastOrder: null,
      setLastOrder: (lastOrder) => set({ lastOrder }),
    }),
    {
      name: "luzanika-last-order",
      version: 2,
      migrate: () => ({ lastOrder: null }),
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
