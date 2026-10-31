"use client";

import type { ReactNode } from "react";

import type { CartTotals } from "@/features/cart/cart-totals";
import type { RegionCode } from "@/types/region";
import { formatRegionalPrice } from "@/utils/format-currency";

/** The "Product Summary" card shared by the cart and checkout pages. `children` is the action under the total (Checkout, Pay Now). */
export function OrderSummary({
  totals,
  region,
  children,
}: {
  totals: CartTotals;
  region: RegionCode;
  children: ReactNode;
}) {
  const money = (amount: number) => formatRegionalPrice(amount, region);

  return (
    <aside
      aria-labelledby="order-summary-title"
      className="rounded-xl bg-panel p-5 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start"
    >
      <h2
        id="order-summary-title"
        className="border-b border-black/[0.06] pb-3 font-heading text-xl leading-8 font-semibold"
      >
        Product Summary
      </h2>

      <dl className="mt-4 flex flex-col gap-2 border-b border-black/[0.06] pb-4 text-sm leading-6 text-muted-foreground">
        {[
          ["Total Price", money(totals.subtotal)],
          ["Total Price (Discount)", money(totals.discount)],
          ["Tax & Fee", money(totals.tax)],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-center justify-between gap-4 text-xl leading-8 font-bold">
        <p>Total Price</p>
        <p aria-live="polite">{money(totals.total)}</p>
      </div>

      <div className="mt-5">{children}</div>
    </aside>
  );
}
