import type { Metadata } from "next";

import { CartView } from "@/features/cart/cart-view";

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: "Review the items in your Luzanika cart before checkout.",
};

export default function CartPage() {
  return (
    // Figma: a white page between the grey header and footer.
    <main className="flex-1 bg-white">
      <CartView />
    </main>
  );
}
