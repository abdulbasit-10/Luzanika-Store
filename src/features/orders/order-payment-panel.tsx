"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatTimeLeft, minutesToPay } from "@/features/orders/order-status";
import { PaymentAccount } from "@/features/orders/payment-account";
import { PaymentProofForm } from "@/features/orders/payment-proof-form";
import { isTransferMethod } from "@/features/orders/payment-methods";
import { useOrderActions } from "@/features/orders/use-orders";
import { usePaymentOptions } from "@/features/orders/use-payment-options";
import type { Order } from "@/features/orders/types";
import { formatRegionalPrice } from "@/utils/format-currency";

/** Re-reads the clock every 30 seconds, so "pay within N minutes" counts down on screen. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Where to send the money for a bank, Easypaisa or JazzCash order, and the form to prove it was sent. */
function TransferSteps({ order }: { order: Order }) {
  const { options } = usePaymentOptions(order.market);
  const option = options?.methods.find(
    (candidate) => candidate.method === order.paymentMethod,
  );

  return (
    <div className="mt-2 rounded-md border border-black/10 bg-white p-2">
      <p>
        Send <strong>{formatRegionalPrice(order.total, order.market)}</strong>{" "}
        to this account and keep the transaction ID:
      </p>
      {option ? (
        <PaymentAccount option={option} />
      ) : (
        <p className="mt-1 text-muted-foreground">
          The account details are not available right now. Please contact
          customer service.
        </p>
      )}
      <PaymentProofForm order={order} />
    </div>
  );
}

/**
 * What can be done with an order whose payment is not finished:
 *  - cash on delivery: a reminder to pay the courier;
 *  - bank transfer, Easypaisa, JazzCash: where to send the money, the form for the
 *    proof, and what staff made of it (checking, or why it was rejected);
 *  - card: how long is left, and (development only) the provider's stand-in buttons.
 * Orders still waiting can be cancelled, except while staff check a proof.
 * Renders nothing for an order that needs none of this.
 */
export function OrderPaymentPanel({ order }: { order: Order }) {
  const { cancel, simulate } = useOrderActions();
  const now = useNow();

  if (
    order.paymentMethod === "cod" &&
    order.paymentStatus === "pending" &&
    order.status !== "cancelled"
  ) {
    return (
      <div className="mt-3 rounded-lg bg-panel p-3 text-xs">
        <p role="status">
          Pay <strong>{formatRegionalPrice(order.total, order.market)}</strong>{" "}
          in cash to the courier when your order arrives.
        </p>
      </div>
    );
  }

  if (order.status !== "waiting_payment") return null;
  const transfer = isTransferMethod(order.paymentMethod);
  const checking = order.paymentStatus === "awaiting_verification";
  const minutes = minutesToPay(order.reservationExpiresAt, now);
  const busy = cancel.isPending || simulate.isPending;

  return (
    <div className="mt-3 rounded-lg bg-panel p-3 text-xs">
      <p role="status">
        {checking
          ? "We received your payment proof and are checking it. We will email you as soon as it is confirmed. "
          : order.paymentStatus === "failed"
            ? transfer
              ? `We could not confirm your payment${
                  order.paymentProof?.rejectionReason
                    ? `: ${order.paymentProof.rejectionReason}`
                    : ""
                }. Please send a new proof. `
              : "The last payment attempt failed. You can try again. "
            : "This order is waiting for payment. "}
        {minutes === null
          ? null
          : minutes === 0
            ? "Its time to pay is almost over."
            : `Your items are held for ${formatTimeLeft(minutes)} more; after that the order is cancelled.`}
      </p>

      {transfer && !checking ? <TransferSteps order={order} /> : null}

      {order.paymentProvider === "simulated" ? (
        <div className="mt-2 rounded-md border border-dashed border-black/20 bg-white p-2">
          <p className="font-medium">Development mode: no real payment</p>
          <p className="mt-0.5 text-muted-foreground">
            Card payments will be handled by Stripe. Until then, play the
            provider&apos;s message yourself.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                simulate.mutate({ number: order.number, outcome: "success" })
              }
            >
              Simulate successful payment
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                simulate.mutate({ number: order.number, outcome: "failure" })
              }
            >
              Simulate failed payment
            </Button>
          </div>
        </div>
      ) : null}

      {checking ? null : (
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => cancel.mutate(order.number)}
          className="mt-2 border-foreground"
        >
          Cancel order
        </Button>
      )}
    </div>
  );
}
