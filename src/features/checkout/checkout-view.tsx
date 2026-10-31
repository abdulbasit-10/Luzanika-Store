"use client";

import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getCartTotals } from "@/features/cart/cart-totals";
import {
  CheckoutContent,
  type PlacedOrderSummary,
} from "@/features/checkout/checkout-content";
import { OrderPlaced } from "@/features/checkout/order-placed";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCartStore } from "@/stores/cart-store";
import { useUiStore } from "@/stores/ui-store";

function CheckoutSkeleton() {
  return (
    <div role="status" className="animate-pulse space-y-3">
      <div className="h-36 rounded-xl bg-black/[0.04]" />
      <div className="h-40 rounded-xl bg-black/[0.04]" />
      <div className="h-64 rounded-xl bg-black/[0.04]" />
      <span className="sr-only">Loading checkout…</span>
    </div>
  );
}

/**
 * The checkout page. It checks out the items selected in the cart, which only
 * exists in the browser, so the content waits for hydration; the server HTML
 * has the heading and a placeholder.
 */
export function CheckoutView() {
  const hydrated = useHydrated();
  const lines = useCartStore((state) => state.lines);
  const region = useUiStore((state) => state.region);
  const [order, setOrder] = useState<PlacedOrderSummary | null>(null);

  const selected = lines.filter((line) => line.selected);
  const totals = getCartTotals(lines, region);

  if (order) {
    return (
      <Container className="py-12 lg:py-16">
        <OrderPlaced order={order} />
      </Container>
    );
  }

  return (
    <Container className="pt-12 pb-16 lg:pt-[min(64px,3.5dvh)] lg:pb-16">
      <header>
        <p className="text-sm text-muted-foreground uppercase">
          Express checkout pipeline
        </p>
        <h1 className="mt-3 font-heading text-4xl leading-[1.2] font-normal lg:mt-[min(10px,1.4dvh)] lg:text-[clamp(1.75rem,min(3vw,5dvh),2.5rem)]">
          Checkout And Payment
        </h1>
        <p className="mt-3 max-w-[38.75rem] text-[15px] leading-6 lg:mt-[min(10px,1.4dvh)]">
          Complete your delivery and financial credentials to finalize your
          order.
        </p>
      </header>

      <div className="mt-6 lg:mt-[min(24px,2.8dvh)]">
        {!hydrated ? (
          <CheckoutSkeleton />
        ) : selected.length === 0 ? (
          <EmptyState
            title="Nothing to check out"
            description="Select at least one item in your cart to continue."
            action={<ButtonLink href="/cart">Go to cart</ButtonLink>}
          />
        ) : (
          <CheckoutContent
            lines={selected}
            totals={totals}
            region={region}
            onPlaced={setOrder}
          />
        )}
      </div>
    </Container>
  );
}
