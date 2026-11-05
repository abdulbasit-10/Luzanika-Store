import type { Metadata } from "next";

import { AdminDiscountsView } from "@/features/admin-discounts/admin-discounts-view";

export const metadata: Metadata = { title: "Discounts" };

export const instant = false;

export default function AdminDiscountsPage() {
  return <AdminDiscountsView />;
}
