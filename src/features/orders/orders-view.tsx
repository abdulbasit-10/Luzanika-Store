"use client";

import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { getOrderStatus, ORDER_STATUSES } from "@/features/orders/order-status";
import { OrderRow } from "@/features/orders/order-row";
import type { OrderStatus } from "@/features/orders/types";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAuthStore } from "@/stores/auth-store";
import { useOrderHistoryStore } from "@/stores/order-history-store";
import type { ConfirmedOrder } from "@/features/orders/types";

type Filter = "all" | OrderStatus;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...ORDER_STATUSES,
];

const NO_ORDERS: ConfirmedOrder[] = [];

/** The signed-in user's orders, newest first, with a filter by status. */
export function OrdersView() {
  const hydrated = useHydrated();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const saved = useOrderHistoryStore((state) =>
    userId ? state.byUser[userId] : undefined,
  );
  const [filter, setFilter] = useState<Filter>("all");

  const orders = hydrated && saved ? saved : NO_ORDERS;
  const shown =
    filter === "all"
      ? orders
      : orders.filter((order) => getOrderStatus(order) === filter);

  return (
    <div className="mx-auto w-full max-w-[740px] lg:mx-0">
      <h1 className="text-lg font-semibold sm:text-xl">List transaction</h1>

      <div
        role="group"
        aria-label="Filter orders by status"
        className="mt-3 flex gap-2 overflow-x-auto pb-1"
      >
        {filters.map(({ value, label }) => {
          const active = filter === value;
          return (
            <FilterPill
              key={value}
              active={active}
              onClick={() => setFilter(value)}
              className={
                active
                  ? "px-4 py-1.5 tracking-normal normal-case xl:px-4"
                  : "border-black/10 bg-white px-4 py-1.5 tracking-normal normal-case hover:bg-white/70 xl:px-4"
              }
            >
              {label}
            </FilterPill>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          className="mt-5 rounded-2xl bg-white"
          title="No orders yet"
          description="Orders you place while signed in show up here."
          action={<ButtonLink href="/products">Start shopping</ButtonLink>}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          className="mt-5 rounded-2xl bg-white"
          title="No orders with this status"
          description="Try another filter to see your other orders."
        />
      ) : (
        <ul className="mt-[clamp(0.75rem,2.4dvh,1.25rem)] flex flex-col gap-3">
          {shown.map((order) => (
            <OrderRow key={order.code} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
