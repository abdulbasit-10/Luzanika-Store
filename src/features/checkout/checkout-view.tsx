"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getCartTotals } from "@/features/cart/cart-totals";
import { CheckoutContent } from "@/features/checkout/checkout-content";
import type { ConfirmedOrder } from "@/features/orders/types";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { useOrderHistoryStore } from "@/stores/order-history-store";
import { useOrderStore } from "@/stores/order-store";
import { useUiStore } from "@/stores/ui-store";

function CheckoutSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="animate-pulse space-y-3">
      <div className="h-36 rounded-xl bg-black/[0.04]" />
      <div className="h-40 rounded-xl bg-black/[0.04]" />
      <div className="h-64 rounded-xl bg-black/[0.04]" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * The checkout page. It checks out the items selected in the cart, which only
 * exists in the browser, so the content waits for hydration; the server HTML
 * has the heading and a placeholder. After an order is placed it hands the
 * order to the confirmation page.
 */
export function CheckoutView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const lines = useCartStore((state) => state.lines);
  const region = useUiStore((state) => state.region);
  const setLastOrder = useOrderStore((state) => state.setLastOrder);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const addToHistory = useOrderHistoryStore((state) => state.add);
  // True from the moment the order is placed until the confirmation page
  // loads, so the emptied cart does not flash "Nothing to check out".
  const [leaving, setLeaving] = useState(false);

  const selected = lines.filter((line) => line.selected);
  const totals = getCartTotals(lines, region);

  function handlePlaced(order: ConfirmedOrder) {
    setLastOrder(order);
    if (userId) addToHistory(userId, order);
    setLeaving(true);
    router.push("/order-confirmation");
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
        {leaving ? (
          <CheckoutSkeleton label="Order placed. Opening your confirmation…" />
        ) : !hydrated ? (
          <CheckoutSkeleton label="Loading checkout…" />
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
            onPlaced={handlePlaced}
          />
        )}
      </div>
    </Container>
  );
}
