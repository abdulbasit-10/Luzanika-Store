"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { CartLineItem } from "@/features/cart/cart-line-item";
import { CheckoutAction } from "@/features/cart/checkout-action";
import { OrderSummary } from "@/features/cart/order-summary";
import { getCartTotals, getItemCount } from "@/features/cart/cart-totals";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCartStore } from "@/stores/cart-store";
import { useUiStore } from "@/stores/ui-store";

/** Placeholder for the saved cart, which only exists in the browser. */
function CartListSkeleton() {
  return (
    <div role="status" className="animate-pulse space-y-6">
      <div className="h-10 rounded bg-white" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-[110px] rounded bg-black/[0.04]" />
      ))}
      <span className="sr-only">Loading your cart…</span>
    </div>
  );
}

/**
 * The cart page. The guest cart lives in the browser (see cart-store), so the
 * list is only shown after hydration; the server HTML has the headings and a
 * placeholder.
 */
export function CartView() {
  const hydrated = useHydrated();
  const lines = useCartStore((state) => state.lines);
  const region = useUiStore((state) => state.region);

  const itemCount = getItemCount(lines);
  const totals = getCartTotals(lines, region);

  return (
    <Container className="pt-12 pb-16 lg:pt-[min(100px,6.5dvh)] lg:pb-20">
      <header>
        <p className="text-base text-muted-foreground uppercase">
          Dispatch bag · Bag inventory
          {hydrated
            ? ` (${itemCount} ${itemCount === 1 ? "item" : "items"})`
            : null}
        </p>
        <h1 className="mt-5 font-heading text-4xl leading-[1.2] font-normal uppercase lg:mt-[min(20px,2.4dvh)] lg:text-[clamp(2rem,min(3.33vw,6dvh),3rem)]">
          Shopping Cart
        </h1>
        <p className="mt-5 max-w-[38.75rem] text-base leading-[25px] lg:mt-[min(23px,2.6dvh)]">
          Review your items before proceeding to checkout. Complimentary
          international express packaging included.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:mt-[min(78px,5dvh)] lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-[51px]">
        <section
          aria-label="Items in your cart"
          className="rounded-xl bg-panel p-4 sm:p-5 lg:px-5 lg:pt-5 lg:pb-4"
        >
          {!hydrated ? (
            <CartListSkeleton />
          ) : lines.length === 0 ? (
            <EmptyState
              title="Your cart is empty"
              description="Add something from our collections and it will appear here."
              action={<ButtonLink href="/products">Browse products</ButtonLink>}
            />
          ) : (
            <>
              <div
                aria-hidden
                className="hidden h-9 items-center justify-between bg-white px-5 text-xs font-semibold uppercase lg:flex"
              >
                <span>Exhibit &amp; Description</span>
                <span className="flex w-[232px] justify-between">
                  <span>Quantity</span>
                  <span>Line Valuation</span>
                </span>
              </div>
              <ul className="mt-4">
                {lines.map((line) => (
                  <CartLineItem key={line.key} line={line} region={region} />
                ))}
              </ul>
            </>
          )}
        </section>

        <OrderSummary totals={totals} region={region}>
          <CheckoutAction canCheckout={totals.selectedCount > 0} />
        </OrderSummary>
      </div>
    </Container>
  );
}
