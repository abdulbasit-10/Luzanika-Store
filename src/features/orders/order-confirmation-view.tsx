"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { PaymentMethod } from "@/features/checkout/checkout-schema";
import { OrderItemThumbnails } from "@/features/orders/order-item-thumbnails";
import type { PaymentStatus } from "@/features/orders/types";
import { useHydrated } from "@/hooks/use-hydrated";
import { useOrderStore } from "@/stores/order-store";
import { cn } from "@/utils/cn";
import { formatRegionalPrice } from "@/utils/format-currency";

const methodLabels: Record<PaymentMethod, string> = {
  card: "Credit Card",
  paypal: "PayPal",
  "gift-card": "Gift Card",
};

const statusLabels: Record<PaymentStatus, string> = {
  paid: "Payment Successful",
  pending: "Payment Pending",
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const DETAILS_ID = "order-details";

/** Figma's pill buttons: dark "Back to home" and white "Check Detail". */
const pillClass = "h-10 rounded-full px-6 py-0 text-[13px]";

/**
 * The order confirmation page. It shows the order that was just placed, which
 * is kept in sessionStorage, so the content waits for hydration. Opening the
 * page without an order explains that and links back to the shop.
 */
export function OrderConfirmationView() {
  const hydrated = useHydrated();
  const order = useOrderStore((state) => state.lastOrder);

  if (!hydrated) {
    return (
      <Container className="py-16">
        <p role="status" className="sr-only">
          Loading your order…
        </p>
      </Container>
    );
  }

  if (!order) {
    return (
      <Container className="py-16">
        <EmptyState
          title="No recent order"
          description="Your order confirmation appears here right after you place an order."
          action={<ButtonLink href="/products">Browse products</ButtonLink>}
        />
      </Container>
    );
  }

  const rows = [
    ["Order code:", order.code],
    ["Date:", dateFormat.format(new Date(order.placedAt))],
    ["Total:", formatRegionalPrice(order.total, order.region)],
    ["Payment method:", methodLabels[order.paymentMethod]],
  ];

  return (
    <Container className="flex flex-col items-center pt-8 pb-12 text-center lg:pt-[min(40px,3.5dvh)] lg:pb-14">
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success lg:size-12"
      >
        <Check className="size-7" strokeWidth={3} />
      </span>

      <h1 className="mt-4 font-heading text-[1.75rem] leading-tight font-semibold lg:mt-[min(16px,2dvh)] lg:text-[clamp(1.75rem,min(2.45vw,5dvh),2.2rem)]">
        Your Order Has Been Confirmed!
      </h1>
      <p className="mt-2 max-w-[41rem] text-[15px] leading-6 text-muted-foreground lg:mt-[min(10px,1.4dvh)]">
        Your payment will be processed within 30 minutes. If you have any
        problem, please{" "}
        <Link href="/contact" className="underline hover:text-foreground">
          contact customer service
        </Link>
        . Detailed information is included below.
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-3 lg:mt-[min(16px,2dvh)]">
        <ButtonLink href="/" className={pillClass}>
          Back to home
        </ButtonLink>
        <ButtonLink
          href={`#${DETAILS_ID}`}
          variant="secondary"
          className={cn(pillClass, "border-transparent")}
        >
          Check Detail
        </ButtonLink>
      </div>

      <section
        id={DETAILS_ID}
        aria-labelledby="order-thanks"
        className="mt-5 w-full max-w-[34rem] scroll-mt-[calc(var(--header-height)+1rem)] rounded-3xl bg-white px-6 py-5 lg:mt-[min(20px,2.5dvh)] lg:py-4"
      >
        <h2
          id="order-thanks"
          className="text-xl leading-8 text-muted-foreground lg:text-[22px]"
        >
          Thank you! <span aria-hidden>🎉</span>
        </h2>

        <div className="mt-3">
          <OrderItemThumbnails items={order.items} />
        </div>

        <dl className="mx-auto mt-4 grid max-w-[18rem] grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-left text-[15px] leading-[22px] sm:max-w-[22rem] sm:gap-x-10">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
          <dt className="text-muted-foreground">Payment Status:</dt>
          <dd
            className={cn(
              "font-semibold",
              order.paymentStatus === "paid"
                ? "text-success"
                : "text-muted-foreground",
            )}
          >
            {statusLabels[order.paymentStatus]}
          </dd>
        </dl>

        <ButtonLink
          href="/orders"
          className={cn(pillClass, "mt-4 h-9 px-7 font-normal lg:mt-3")}
        >
          Purchase history
        </ButtonLink>
      </section>
    </Container>
  );
}
