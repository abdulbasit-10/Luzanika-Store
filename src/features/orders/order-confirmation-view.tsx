"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  orderDateFormat,
  paymentMethodLabels,
} from "@/features/orders/order-status";
import { OrderItemThumbnails } from "@/features/orders/order-item-thumbnails";
import { OrderPaymentPanel } from "@/features/orders/order-payment-panel";
import type { Order, PaymentStatus } from "@/features/orders/types";
import { useOrder } from "@/features/orders/use-orders";
import { useAuthReady, useAuthStore } from "@/stores/auth-store";
import { cn } from "@/utils/cn";
import { formatRegionalPrice } from "@/utils/format-currency";

const statusLabels: Record<PaymentStatus, string> = {
  paid: "Payment Successful",
  pending: "Payment Pending",
  failed: "Payment Failed",
  refunded: "Refunded",
  partially_refunded: "Partially Refunded",
};

/** The headline and the sentence under it, which depend on how far along the order is. */
function describe(order: Order) {
  if (order.status === "cancelled") {
    return {
      title: "This Order Was Cancelled",
      text: "The items went back on sale. If you paid, or this is a mistake, please contact customer service.",
    };
  }
  if (order.status === "waiting_payment") {
    return {
      title: "Order Received. Waiting for Payment",
      text: "Your items are held while the payment is completed. If you have any problem, please",
    };
  }
  return {
    title: "Your Order Has Been Confirmed!",
    text: "Your payment was received and your order is being prepared. If you have any problem, please",
  };
}

const DETAILS_ID = "order-details";

/** Figma's pill buttons: dark "Back to home" and white "Check Detail". */
const pillClass = "h-10 rounded-full px-6 py-0 text-[13px]";

/**
 * The order confirmation page. It shows the order named in the address
 * (?order=LZ-PK-000123), read from the server; only its owner can see it. While
 * the order waits for payment the page refreshes itself, so it changes as soon
 * as the payment provider confirms the payment.
 */
export function OrderConfirmationView() {
  const number = useSearchParams().get("order");
  const authReady = useAuthReady();
  const signedIn = useAuthStore((state) => state.user !== null);
  const { order, isLoading, notFound, isError, refetch } = useOrder(number);

  if (!authReady || isLoading) {
    return (
      <Container className="py-16">
        <p role="status" className="sr-only">
          Loading your order…
        </p>
      </Container>
    );
  }

  if (!signedIn || !number || notFound || isError || !order) {
    return (
      <Container className="py-16">
        <EmptyState
          title={
            isError && !notFound
              ? "We couldn't load your order"
              : "Order not found"
          }
          description={
            isError && !notFound
              ? "Please check your connection and try again."
              : !signedIn
                ? "Log in to see your orders."
                : "Your order confirmation appears here right after you place an order."
          }
          action={
            isError && !notFound ? (
              <Button onClick={() => void refetch()}>Try again</Button>
            ) : (
              <ButtonLink href={signedIn ? "/orders" : "/login?next=%2Forders"}>
                {signedIn ? "Your orders" : "Log in"}
              </ButtonLink>
            )
          }
        />
      </Container>
    );
  }

  const { title, text } = describe(order);
  const rows = [
    ["Order code:", order.number],
    ["Date:", orderDateFormat.format(new Date(order.placedAt))],
    ["Total:", formatRegionalPrice(order.total, order.market)],
    ["Payment method:", paymentMethodLabels[order.paymentMethod]],
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
        {title}
      </h1>
      <p className="mt-2 max-w-[41rem] text-[15px] leading-6 text-muted-foreground lg:mt-[min(10px,1.4dvh)]">
        {text}{" "}
        {order.status === "cancelled" ? null : (
          <Link href="/contact" className="underline hover:text-foreground">
            contact customer service
          </Link>
        )}
        {order.status === "cancelled"
          ? null
          : ". Detailed information is included below."}
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
                : order.paymentStatus === "failed"
                  ? "text-danger"
                  : "text-muted-foreground",
            )}
          >
            {statusLabels[order.paymentStatus]}
          </dd>
        </dl>

        <div className="text-left">
          <OrderPaymentPanel order={order} />
        </div>

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
