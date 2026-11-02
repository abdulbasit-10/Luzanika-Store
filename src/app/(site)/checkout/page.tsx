import type { Metadata } from "next";

import { CheckoutView } from "@/features/checkout/checkout-view";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Enter your delivery details and pay for your Luzanika order.",
};

export default function CheckoutPage() {
  return (
    <main className="flex-1">
      <CheckoutView />
    </main>
  );
}
