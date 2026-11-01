"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { minutesToPay } from "@/features/orders/order-status";
import { useOrderActions } from "@/features/orders/use-orders";
import type { Order } from "@/features/orders/types";

/** Re-reads the clock every 30 seconds, so "pay within N minutes" counts down on screen. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * What can be done with an order that has not been paid: how long is left
 * (its items are held for that time), cancel it, and, while the payment
 * provider is the development stand-in, play the provider's "paid" / "failed"
 * message. Renders nothing for any other order.
 */
export function OrderPaymentPanel({ order }: { order: Order }) {
  const { cancel, simulate } = useOrderActions();
  const now = useNow();

  if (order.status !== "waiting_payment") return null;
  const minutes = minutesToPay(order.reservationExpiresAt, now);
  const busy = cancel.isPending || simulate.isPending;

  return (
    <div className="mt-3 rounded-lg bg-panel p-3 text-xs">
      <p role="status">
        {order.paymentStatus === "failed"
          ? "The last payment attempt failed. You can try again. "
          : "This order is waiting for payment. "}
        {minutes === null
          ? null
          : minutes === 0
            ? "Its time to pay is almost over."
            : `Your items are held for ${minutes} more ${minutes === 1 ? "minute" : "minutes"}; after that the order is cancelled.`}
      </p>

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

      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => cancel.mutate(order.number)}
        className="mt-2 border-foreground"
      >
        Cancel order
      </Button>
    </div>
  );
}
