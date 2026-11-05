import { Check } from "lucide-react";

import { RegionFlag } from "@/components/shared/region-flag";
import { paymentMethodLabels } from "@/features/orders/payment-methods";
import { cn } from "@/utils/cn";

import type { AdminOrderDetail } from "./order-detail-service";
import { dateTimeFormat } from "./order-detail-ui";
import { orderProgress } from "./order-progress";
import {
  formatOrderTotal,
  orderStatusLabel,
  paymentStatusLabel,
  regionName,
} from "./orders-labels";
import { StatusChip } from "./status-chip";

const tag =
  "inline-flex items-center gap-1.5 rounded-md border border-border bg-panel px-2 py-0.5 text-xs font-medium whitespace-nowrap text-foreground";

/** Who the order is for, the market and payment method, and where the order stands. */
export function OrderHeader({ order }: { order: AdminOrderDetail }) {
  const methodLabel =
    (paymentMethodLabels as Record<string, string>)[order.paymentMethod] ??
    order.paymentMethod;

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="truncate text-[clamp(1.25rem,3.8dvh,2rem)] leading-tight font-semibold tracking-[-0.5px] text-[#151d2b]">
          {order.shipping.name}
        </h1>
        <p className="text-[clamp(0.875rem,2.2dvh,1rem)] text-[#6f7b8c]">
          Order #{order.number}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={tag}>
          <RegionFlag region={order.market} />
          {regionName(order.market)} ({order.currency})
        </span>
        <span className={tag}>{methodLabel}</span>
        <StatusChip status={order.status} deleted={order.deletedAt !== null} />
      </div>
    </div>
  );
}

/** The road from pending to delivered, or a red end state when the order left it. */
export function OrderProgress({ order }: { order: AdminOrderDetail }) {
  const steps = orderProgress(order.status);

  if (!steps) {
    const ended = [...order.history]
      .reverse()
      .find((entry) => entry.to === order.status);
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-danger/20 bg-[#feeff2] px-4 py-2.5 text-sm text-danger"
      >
        <span className="font-semibold">{orderStatusLabel(order.status)}</span>
        {ended ? (
          <span>{dateTimeFormat.format(new Date(ended.at))}</span>
        ) : null}
        {order.cancelReason ? <span>“{order.cancelReason}”</span> : null}
      </div>
    );
  }

  return (
    <ol aria-label="Order progress" className="flex items-start px-8 pb-1">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className={cn("flex items-start", index > 0 && "flex-1")}
        >
          {index > 0 ? (
            <span
              aria-hidden
              className={cn(
                "mt-[calc(clamp(0.875rem,2.1dvh,1.125rem)-1.5px)] h-[3px] flex-1 rounded-full",
                step.state === "todo" ? "bg-[#e1e4ea]" : "bg-success",
              )}
            />
          ) : null}
          <div className="flex w-0 flex-col items-center overflow-visible">
            <span
              className={cn(
                "flex size-[clamp(1.75rem,4.2dvh,2.25rem)] shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                step.state === "done" && "bg-success text-white",
                step.state === "current" && "bg-[#5468e7] text-white",
                step.state === "todo" && "bg-[#e1e4ea] text-[#6f7b8c]",
              )}
            >
              {step.state === "done" ? (
                <Check aria-hidden className="size-4" strokeWidth={3} />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                "mt-1 text-xs font-medium whitespace-nowrap",
                step.state === "todo" ? "text-[#6f7b8c]" : "text-foreground",
              )}
            >
              {step.label}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-3 py-[clamp(0.375rem,1dvh,0.75rem)] text-center">
      <dt className="text-xs text-[#6f7b8c]">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

/** The four numbers staff look for first. */
export function OrderSummaryStrip({ order }: { order: AdminOrderDetail }) {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <section aria-label="Order summary">
      <h2 className="sr-only">Order Information</h2>
      <dl className="grid grid-cols-2 divide-border rounded-xl border border-border bg-panel sm:grid-cols-4 sm:divide-x">
        <Stat
          label="Placed"
          value={dateTimeFormat.format(new Date(order.placedAt))}
        />
        <Stat
          label="Total items"
          value={`${units} ${units === 1 ? "item" : "items"}`}
        />
        <Stat
          label="Order value"
          value={formatOrderTotal(order.amounts.total, order.currency)}
        />
        <Stat label="Payment" value={paymentStatusLabel(order.paymentStatus)} />
      </dl>
    </section>
  );
}
