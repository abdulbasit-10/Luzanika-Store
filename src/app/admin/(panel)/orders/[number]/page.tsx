import type { Metadata } from "next";

import { AdminOrderDetailView } from "@/features/admin-orders/order-detail-view";

export const metadata: Metadata = { title: "Order" };

export const instant = false;

export default async function AdminOrderPage({
  params,
}: PageProps<"/admin/orders/[number]">) {
  const { number } = await params;
  return <AdminOrderDetailView number={decodeURIComponent(number)} />;
}
