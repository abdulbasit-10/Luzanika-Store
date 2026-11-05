"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import { RegionFlag } from "@/components/shared/region-flag";
import { cn } from "@/utils/cn";

import type { AdminOrderListItem } from "./admin-orders-service";
import { OrderStatusDropdown } from "./order-status-dropdown";
import { pageItems } from "./page-items";
import { formatOrderTotal, regionName } from "./orders-labels";

const headCell =
  "h-[clamp(2rem,4.8dvh,2.5rem)] border-r border-b border-border bg-background px-4 text-left text-[0.8125rem] font-medium tracking-[0.3px] whitespace-nowrap text-[#737373] uppercase last:border-r-0";
const bodyCell =
  "h-[clamp(2.25rem,6.2dvh,3.5rem)] border-r border-b border-border bg-panel px-4 text-sm last:border-r-0";

export function OrdersTable({
  orders,
  selected,
  onToggle,
  onToggleAll,
  message,
}: {
  orders: AdminOrderListItem[];
  selected: ReadonlySet<string>;
  onToggle: (number: string) => void;
  onToggleAll: () => void;
  /** Shown instead of rows: loading, an error or "nothing found". */
  message?: string;
}) {
  const router = useRouter();
  const allSelected =
    orders.length > 0 && orders.every((order) => selected.has(order.number));

  return (
    <div className="min-h-0 flex-[0_1_auto] overflow-auto">
      <table className="w-full min-w-[44rem] table-fixed border-separate border-spacing-0">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[24%]" />
          <col className="w-[18%]" />
          <col className="w-[19%]" />
          <col className="w-[17%]" />
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr>
            <th scope="col" className={headCell}>
              <span className="flex items-center gap-3">
                <Checkbox
                  aria-label="Select all orders on this page"
                  checked={allSelected}
                  onChange={onToggleAll}
                  disabled={orders.length === 0}
                />
                Order ID
              </span>
            </th>
            <th scope="col" className={headCell}>
              Customer
            </th>
            <th scope="col" className={headCell}>
              Market
            </th>
            <th scope="col" className={headCell}>
              Total
            </th>
            <th scope="col" className={headCell}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.number}
              onClick={() => router.push(`/admin/orders/${order.number}`)}
              className="cursor-pointer hover:[&>td]:bg-muted/60"
            >
              <td className={cn(bodyCell, "font-medium text-foreground")}>
                <span className="flex items-center gap-3">
                  <span onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      aria-label={`Select order ${order.number}`}
                      checked={selected.has(order.number)}
                      onChange={() => onToggle(order.number)}
                    />
                  </span>
                  <Link
                    href={`/admin/orders/${order.number}`}
                    className="truncate underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    #{order.number}
                  </Link>
                </span>
              </td>
              <td className={cn(bodyCell, "text-foreground")}>
                <span className="block truncate" title={order.customerEmail}>
                  {order.recipientName || order.customerEmail}
                </span>
              </td>
              <td className={cn(bodyCell, "text-foreground")}>
                <span className="flex items-center gap-2">
                  <RegionFlag region={order.market} />
                  {regionName(order.market)}
                </span>
              </td>
              <td className={cn(bodyCell, "text-foreground")}>
                {formatOrderTotal(order.total, order.currency)}
              </td>
              <td className={bodyCell} onClick={(e) => e.stopPropagation()}>
                <OrderStatusDropdown order={order} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {message ? (
        <p
          role="status"
          className="bg-panel px-4 py-8 text-center text-sm text-muted-foreground"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

const controlClass =
  "flex size-8 items-center justify-center bg-white text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40";
const ring = "shadow-[0_4px_8px_-5px_rgba(0,0,0,0.15),0_0_0_1px_#e5e5e5]";

/** "Page 2 of 15" and the page buttons, on the grey bar under the table. */
export function OrdersPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-background px-4 py-[clamp(0.5rem,1.4dvh,1rem)]">
      <p className="text-sm font-medium tracking-[0.28px] text-foreground">
        Page {page} of {totalPages}
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(controlClass, ring, "rounded-lg")}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <ul className={cn("flex overflow-hidden rounded-lg bg-white", ring)}>
          {pageItems(page, totalPages).map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="border-r border-border last:border-r-0"
            >
              {item === "…" ? (
                <span className={controlClass}>…</span>
              ) : (
                <button
                  type="button"
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  onClick={() => onPageChange(item)}
                  className={cn(
                    controlClass,
                    item === page && "bg-foreground text-white",
                  )}
                >
                  {item}
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={cn(controlClass, ring, "rounded-lg")}
        >
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </nav>
    </div>
  );
}
