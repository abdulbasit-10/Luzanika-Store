"use client";

import { buttonStyles } from "@/components/ui/button";
import type { CartTotals } from "@/features/cart/cart-totals";
import type { RegionCode } from "@/types/region";
import { cn } from "@/utils/cn";
import { formatRegionalPrice } from "@/utils/format-currency";
import Link from "next/link";

const checkoutClass = buttonStyles({
  className: "h-11 w-full rounded-lg px-4 py-0 text-[15px]",
});

export function CartSummary({
  totals,
  region,
}: {
  totals: CartTotals;
  region: RegionCode;
}) {
  const money = (amount: number) => formatRegionalPrice(amount, region);
  const canCheckout = totals.selectedCount > 0;

  return (
    <aside
      aria-labelledby="cart-summary-title"
      className="rounded-xl bg-panel p-5 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start"
    >
      <h2
        id="cart-summary-title"
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

      <div className="mt-5">
        {canCheckout ? (
          <Link href="/checkout" className={checkoutClass}>
            Checkout
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className={cn(checkoutClass, "cursor-not-allowed")}
          >
            Checkout
          </button>
        )}
        {canCheckout ? null : (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Select at least one item to check out.
          </p>
        )}
      </div>
    </aside>
  );
}
