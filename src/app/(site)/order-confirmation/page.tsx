import type { Metadata } from "next";

import { Suspense } from "react";

import { OrderConfirmationView } from "@/features/orders/order-confirmation-view";

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Your Luzanika order has been confirmed.",
  // Personal to the shopper; nothing for search engines to index.
  robots: { index: false, follow: false },
};

export default function OrderConfirmationPage() {
  return (
    <main className="flex-1">
      {/* The order number is read from the address, which needs a Suspense boundary. */}
      <Suspense>
        <OrderConfirmationView />
      </Suspense>
    </main>
  );
}
