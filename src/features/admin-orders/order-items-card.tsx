import Image from "next/image";

import { formatMinor } from "@/features/admin-shell/admin-money";

import type { AdminOrderDetail } from "./order-detail-service";
import { DetailCard } from "./order-detail-ui";

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "flex justify-between gap-3 border-t border-border pt-2 text-base font-bold text-foreground"
          : muted
            ? "flex justify-between gap-3 text-muted-foreground"
            : "flex justify-between gap-3 text-foreground"
      }
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** What was bought, and the sum, in the order's own currency. */
export function OrderItemsCard({ order }: { order: AdminOrderDetail }) {
  const money = (minor: number) =>
    formatMinor(minor, order.currency, { alwaysCents: true });
  const { amounts } = order;

  return (
    <DetailCard title="Order Items">
      <ul className="divide-y divide-border">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2 first:pt-0">
            {item.image ? (
              <Image
                src={item.image.src}
                alt={item.image.alt}
                width={44}
                height={44}
                unoptimized
                className="size-11 shrink-0 rounded-md bg-white object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="size-11 shrink-0 rounded-md bg-background"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {item.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {[item.color, item.size].filter(Boolean).join(" · ") || "—"} ·
                SKU {item.sku}
                {item.restockedQuantity > 0
                  ? ` · ${item.restockedQuantity} put back in stock`
                  : ""}
              </p>
            </div>
            <p className="shrink-0 text-right text-sm text-muted-foreground">
              {item.quantity} × {money(item.unitAmount)}
            </p>
            <p className="w-28 shrink-0 text-right text-sm font-semibold text-foreground">
              {money(item.lineTotal)}
            </p>
          </li>
        ))}
      </ul>
      <dl className="mt-3 ml-auto flex max-w-xs flex-col gap-1 text-sm">
        <Row label="Subtotal" value={money(amounts.subtotal)} />
        {amounts.discountTotal > 0 ? (
          <Row label="Discount" value={`− ${money(amounts.discountTotal)}`} />
        ) : null}
        <Row label="Shipping" value={money(amounts.shippingTotal)} />
        {amounts.taxTotal > 0 ? (
          <Row
            label={amounts.taxIncluded ? "VAT (included)" : "VAT"}
            value={money(amounts.taxTotal)}
            muted={amounts.taxIncluded === true}
          />
        ) : null}
        <Row label="Total" value={money(amounts.total)} strong />
        {amounts.refundedTotal > 0 ? (
          <Row
            label="Refunded"
            value={`− ${money(amounts.refundedTotal)}`}
            muted
          />
        ) : null}
      </dl>
    </DetailCard>
  );
}
