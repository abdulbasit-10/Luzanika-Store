"use client";

import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatRegionalPrice } from "@/utils/format-currency";
import {
  orderDateFormat,
  orderStatusLabels,
  paymentMethodLabels,
} from "@/features/orders/order-status";
import { OrderPaymentPanel } from "@/features/orders/order-payment-panel";
import type { Order, OrderItem, OrderStatus } from "@/features/orders/types";
import { cn } from "@/utils/cn";

const dotColors: Record<OrderStatus, string> = {
  waiting_payment: "bg-amber-500",
  processing: "bg-accent",
  in_delivery: "bg-blue-600",
  completed: "bg-success",
  cancelled: "bg-black/30",
  refunded: "bg-black/30",
};

const describeVariant = ({ color, size }: OrderItem) =>
  [color, size].filter(Boolean).join(" • ");

/** One order: its first item as in the design, and a Detail button that opens everything about the order. */
export function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const [first, ...others] = order.items;
  const status = order.status;
  const variant = first ? describeVariant(first) : "";

  return (
    <li className="rounded-lg bg-white p-3">
      <div className="flex items-center gap-3.5">
        <span className="relative block size-[clamp(3rem,8dvh,3.75rem)] shrink-0 overflow-hidden rounded bg-muted">
          {first?.image ? (
            <Image
              src={first.image.src}
              alt=""
              fill
              sizes="60px"
              style={{ objectPosition: first.image.position }}
              className="object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon aria-hidden className="size-5" />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span
              aria-hidden
              className={cn("size-1.5 rounded-full", dotColors[status])}
            />
            {orderStatusLabels[status]}
          </p>
          <h2 className="mt-0.5 truncate text-sm font-semibold">
            {first?.name ?? "Order"}
          </h2>
          {variant ? (
            <p className="text-[11px] text-muted-foreground">{variant}</p>
          ) : null}
          <p className="mt-1 text-xs">
            {first?.quantity ?? 0}
            {others.length > 0 ? (
              <span className="ml-2 text-muted-foreground">
                +{others.length} more {others.length === 1 ? "item" : "items"}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-lg leading-6 font-bold sm:text-xl">
            {formatRegionalPrice(order.total, order.market)}
          </p>
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((value) => !value)}
            className="rounded-md border-foreground px-4 py-1.5 text-xs font-medium hover:bg-black/5"
          >
            {open ? "Hide" : "Detail"}
          </Button>
        </div>
      </div>

      {open ? (
        <div
          id={detailsId}
          className="mt-3 border-t border-black/[0.06] pt-3 text-xs"
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
            <dt className="text-muted-foreground">Order code</dt>
            <dd className="font-medium">{order.number}</dd>
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-medium">
              {orderDateFormat.format(new Date(order.placedAt))}
            </dd>
            <dt className="text-muted-foreground">Payment method</dt>
            <dd className="font-medium">
              {paymentMethodLabels[order.paymentMethod]}
            </dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{orderStatusLabels[status]}</dd>
          </dl>
          <OrderPaymentPanel order={order} />
          <ul className="mt-3 flex flex-col gap-1.5 border-t border-black/[0.06] pt-3">
            {order.items.map((item, index) => (
              <li key={index} className="flex justify-between gap-3">
                <span className="min-w-0">
                  {item.name}
                  {describeVariant(item) ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {describeVariant(item)}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  × {item.quantity} ·{" "}
                  {formatRegionalPrice(item.lineTotal, order.market)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
