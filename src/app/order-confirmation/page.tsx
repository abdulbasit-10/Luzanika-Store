import type { Metadata } from "next";

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
      <OrderConfirmationView />
    </main>
  );
}
