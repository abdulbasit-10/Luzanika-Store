import type { Metadata } from "next";

import { CheckoutView } from "@/features/checkout/checkout-view";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Enter your delivery details and pay for your Luzanika order.",
};

export default function CheckoutPage() {
  return (
    // Figma: a white page between the grey header and footer.
    <main className="flex-1 bg-white">
      <CheckoutView />
    </main>
  );
}
