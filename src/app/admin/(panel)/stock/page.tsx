import type { Metadata } from "next";

import { AdminStockView } from "@/features/admin-stock/admin-stock-view";

export const metadata: Metadata = { title: "Inventory" };

export const instant = false;

export default function AdminStockPage() {
  return <AdminStockView />;
}
