"use client";

import { ArrowUpDown, ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { RegionFlag } from "@/components/shared/region-flag";
import { Dropdown } from "@/components/ui/dropdown";
import { StatusChip } from "@/features/admin-orders/orders-table";
import {
  formatOrderTotal,
  regionName,
} from "@/features/admin-orders/orders-labels";
import { cn } from "@/utils/cn";

import type { DashboardRecentOrder } from "./dashboard-service";

type SortKey = "newest" | "oldest" | "highest" | "lowest";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "highest", label: "Highest total" },
  { key: "lowest", label: "Lowest total" },
];

/** Totals are only compared inside a market: PKR and EUR are never put on one scale. */
const COMPARE: Record<
  SortKey,
  (a: DashboardRecentOrder, b: DashboardRecentOrder) => number
> = {
  newest: (a, b) => b.placedAt.localeCompare(a.placedAt),
  oldest: (a, b) => a.placedAt.localeCompare(b.placedAt),
  highest: (a, b) =>
    a.market === b.market
      ? b.total - a.total
      : a.market.localeCompare(b.market),
  lowest: (a, b) =>
    a.market === b.market
      ? a.total - b.total
      : a.market.localeCompare(b.market),
};

const headCell =
  "px-[clamp(0.5rem,1.2vw,1.125rem)] py-[clamp(0.25rem,0.9dvh,0.625rem)] text-[0.8125rem] font-medium text-muted-foreground";
const cell =
  "px-[clamp(0.5rem,1.2vw,1.125rem)] py-[clamp(0.25rem,0.9dvh,0.75rem)] text-sm";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** The newest orders with a search box and a sort menu. Pass null while they load. */
export function RecentOrders({
  orders,
}: {
  orders: DashboardRecentOrder[] | null;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (orders ?? [])
      .filter(
        (order) =>
          !needle ||
          order.number.toLowerCase().includes(needle) ||
          order.recipient.toLowerCase().includes(needle),
      )
      .sort(COMPARE[sort]);
  }, [orders, query, sort]);

  return (
    <section
      aria-labelledby="recent-orders-heading"
      className="flex min-h-0 flex-1 flex-col gap-[clamp(0.375rem,1.4dvh,1rem)] rounded-3xl border border-[#f3f4f6] bg-panel px-[clamp(0.75rem,1.6vw,1.5rem)] py-[clamp(0.5rem,1.6dvh,1.25rem)] shadow-[0_1px_1.7px_rgba(16,24,40,0.04),0_1px_1px_rgba(16,24,40,0.02)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="recent-orders-heading"
          className="text-[clamp(1rem,2.6dvh,1.25rem)] font-bold tracking-[-0.5px] text-foreground"
        >
          Recent orders
        </h2>
        <div className="flex items-center gap-3">
          <label className="relative">
            <span className="sr-only">Search recent orders</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="w-[clamp(9rem,14vw,13rem)] rounded-2xl border border-muted-foreground bg-white py-[clamp(0.25rem,0.8dvh,0.5rem)] pr-4 pl-11 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </label>
          <Dropdown
            align="end"
            triggerLabel="Sort orders"
            triggerClassName="gap-2 rounded-2xl border border-muted-foreground px-4 py-[clamp(0.25rem,0.8dvh,0.5rem)] text-sm font-semibold text-foreground hover:bg-black/5"
            trigger={
              <>
                <ArrowUpDown aria-hidden className="size-5" />
                Sort by
                <ChevronDown aria-hidden className="size-4" />
              </>
            }
          >
            {SORTS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={option.key === sort}
                onClick={() => setSort(option.key)}
                className={cn(
                  "block w-full px-4 py-2 text-left text-sm whitespace-nowrap hover:bg-muted",
                  option.key === sort && "font-semibold",
                )}
              >
                {option.label}
              </button>
            ))}
          </Dropdown>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-panel">
            <tr className="border-b border-[#f3f4f6]">
              <th scope="col" className={headCell}>
                Order Id
              </th>
              <th scope="col" className={headCell}>
                Date
              </th>
              <th scope="col" className={headCell}>
                Customer
              </th>
              <th scope="col" className={headCell}>
                Market
              </th>
              <th scope="col" className={headCell}>
                Status
              </th>
              <th scope="col" className={cn(headCell, "text-right")}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr
                key={order.number}
                className="border-t border-[#f9fafb] first:border-t-0"
              >
                <td className={cn(cell, "font-medium text-foreground")}>
                  <Link
                    href={`/admin/orders/${order.number}`}
                    className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    #{order.number}
                  </Link>
                </td>
                <td className={cn(cell, "text-muted-foreground")}>
                  {dateFormat.format(new Date(order.placedAt))}
                </td>
                <td className={cn(cell, "font-semibold text-foreground")}>
                  {order.recipient || order.email}
                </td>
                <td className={cn(cell, "text-foreground")}>
                  <span className="flex items-center gap-2">
                    <RegionFlag region={order.market} />
                    {regionName(order.market)}
                  </span>
                </td>
                <td className={cell}>
                  <StatusChip status={order.status} />
                </td>
                <td
                  className={cn(cell, "text-right font-bold text-foreground")}
                >
                  {formatOrderTotal(order.total, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders === null || rows.length === 0 ? (
          <p
            role="status"
            className="py-6 text-center text-sm text-muted-foreground"
          >
            {orders === null
              ? "Loading orders…"
              : query
                ? "No orders match your search."
                : "No orders yet."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
