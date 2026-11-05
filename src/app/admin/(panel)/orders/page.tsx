import type { Metadata } from "next";

import { AdminOrdersView } from "@/features/admin-orders/admin-orders-view";

export const metadata: Metadata = { title: "Orders" };

export const instant = false;

export default function AdminOrdersPage() {
  return <AdminOrdersView />;
}
