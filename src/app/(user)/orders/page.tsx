import type { Metadata } from "next";

import { OrdersView } from "@/features/orders/orders-view";

export const metadata: Metadata = {
  title: "Order History",
  description: "The orders you placed at Luzanika.",
  robots: { index: false },
};

export default function OrdersPage() {
  return <OrdersView />;
}
