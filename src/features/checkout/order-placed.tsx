import { Check } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import type { PlacedOrderSummary } from "@/features/checkout/checkout-content";
import { formatRegionalPrice } from "@/utils/format-currency";

/**
 * Temporary result shown after "Pay Now" until the Order Confirmation page is
 * designed. It says plainly that this is a demo order.
 */
export function OrderPlaced({ order }: { order: PlacedOrderSummary }) {
  const { orderNumber, email, itemCount, total, region } = order;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center rounded-xl bg-panel px-6 py-10 text-center">
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <Check className="size-6" strokeWidth={2} />
      </span>
      <h1 className="mt-5 font-heading text-3xl leading-tight font-medium">
        Order placed
      </h1>
      <p className="mt-3 text-base">
        Order <strong>{orderNumber}</strong> · {itemCount}{" "}
        {itemCount === 1 ? "item" : "items"} ·{" "}
        {formatRegionalPrice(total, region)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        A confirmation will be sent to {email}.
      </p>
      <p className="mt-4 rounded-md bg-white px-4 py-2 text-xs text-muted-foreground">
        Demo order: no payment was taken and no email is sent until the backend
        is connected.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/products">Continue shopping</ButtonLink>
        <ButtonLink href="/cart" variant="secondary">
          Back to cart
        </ButtonLink>
      </div>
    </div>
  );
}
