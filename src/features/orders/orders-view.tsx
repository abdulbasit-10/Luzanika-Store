"use client";

import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { ORDER_STATUSES } from "@/features/orders/order-status";
import { OrderRow } from "@/features/orders/order-row";
import type { Order, OrderStatus } from "@/features/orders/types";
import { useOrders } from "@/features/orders/use-orders";

type Filter = "all" | OrderStatus;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...ORDER_STATUSES,
];

const NO_ORDERS: Order[] = [];

/** The signed-in user's orders, newest first, with a filter by status. */
export function OrdersView() {
  const { orders: loaded, isLoading, isError, refetch } = useOrders();
  const [filter, setFilter] = useState<Filter>("all");

  const orders = loaded ?? NO_ORDERS;
  const shown =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);

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

      {isLoading ? (
        <div role="status" className="mt-5 animate-pulse space-y-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-[84px] rounded-lg bg-white" />
          ))}
          <span className="sr-only">Loading your orders…</span>
        </div>
      ) : isError ? (
        <EmptyState
          className="mt-5 rounded-2xl bg-white"
          title="We couldn't load your orders"
          description="Please check your connection and try again."
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      ) : orders.length === 0 ? (
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
            <OrderRow key={order.number} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
