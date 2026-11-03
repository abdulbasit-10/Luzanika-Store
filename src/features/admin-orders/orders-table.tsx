"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toaster";
import { RegionFlag } from "@/components/shared/region-flag";
import { cn } from "@/utils/cn";

import type { AdminOrderListItem } from "./admin-orders-service";
import { pageItems } from "./page-items";
import {
  ORDER_STATUS_TONE,
  formatOrderTotal,
  orderStatusLabel,
  regionName,
  type StatusTone,
} from "./orders-labels";

const CHIP_STYLE: Record<StatusTone, string> = {
  pending: "border-[#ff9f24]/10 bg-[#ff9f24]/10 text-[#ff9f24]",
  success: "border-[#279f51]/10 bg-[#279f51]/10 text-success",
  failed: "border-danger/10 bg-[#feeff2] text-danger",
};

const headCell =
  "h-[clamp(2rem,4.8dvh,2.5rem)] border-r border-b border-border bg-background px-4 text-left text-[0.8125rem] font-medium tracking-[0.3px] whitespace-nowrap text-[#737373] uppercase last:border-r-0";
const bodyCell =
  "h-[clamp(2.25rem,6.2dvh,3.5rem)] border-r border-b border-border bg-panel px-4 text-sm last:border-r-0";

export function StatusChip({
  status,
}: {
  status: AdminOrderListItem["status"];
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tracking-[0.2px] whitespace-nowrap",
        CHIP_STYLE[ORDER_STATUS_TONE[status]],
      )}
    >
      {orderStatusLabel(status)}
    </span>
  );
}

/** The "…" button of a row. Its menu is fixed to the window, so the scrolling table cannot cut it off. */
function RowMenu({ order }: { order: AdminOrderListItem }) {
  const [position, setPosition] = useState<{ top: number; right: number }>();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = position !== undefined;

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(undefined);
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        close();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    if (open) return setPosition(undefined);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }

  async function copy(text: string, what: string) {
    setPosition(undefined);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Could not copy. Select the text and copy it by hand.");
    }
  }

  const itemClass =
    "block w-full px-4 py-2 text-left text-sm whitespace-nowrap hover:bg-muted";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Actions for order ${order.number}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggle}
        className="flex size-7 items-center justify-center rounded-full bg-white shadow-[0_1px_1px_rgba(13,13,18,0.06)] hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <MoreHorizontal aria-hidden className="size-4" />
      </button>
      {position ? (
        <div
          ref={panelRef}
          role="menu"
          style={{ top: position.top, right: position.right }}
          className="fixed z-50 min-w-44 rounded-lg bg-surface py-1.5 shadow-overlay"
        >
          <Link
            href={`/admin/orders/${order.number}`}
            role="menuitem"
            className={itemClass}
          >
            View order
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => copy(order.number, "Order number")}
            className={itemClass}
          >
            Copy order number
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => copy(order.customerEmail, "Email")}
            className={itemClass}
          >
            Copy customer email
          </button>
        </div>
      ) : null}
    </>
  );
}

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
  const allSelected =
    orders.length > 0 && orders.every((order) => selected.has(order.number));

  return (
    <div className="min-h-0 flex-[0_1_auto] overflow-auto">
      <table className="w-full min-w-[44rem] table-fixed border-separate border-spacing-0">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[22%]" />
          <col className="w-[18%]" />
          <col className="w-[19%]" />
          <col className="w-[13%]" />
          <col className="w-[6%]" />
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
            <th scope="col" className={headCell}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.number}>
              <td className={cn(bodyCell, "font-medium text-foreground")}>
                <span className="flex items-center gap-3">
                  <Checkbox
                    aria-label={`Select order ${order.number}`}
                    checked={selected.has(order.number)}
                    onChange={() => onToggle(order.number)}
                  />
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
              <td className={bodyCell}>
                <StatusChip status={order.status} />
              </td>
              <td className={bodyCell}>
                <RowMenu order={order} />
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
