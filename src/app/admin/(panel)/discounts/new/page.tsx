import type { Metadata } from "next";

import { AdminDiscountDetailView } from "@/features/admin-discounts/discount-detail-view";

export const metadata: Metadata = { title: "Add discount" };

export const instant = false;

export default function AdminNewDiscountPage() {
  return <AdminDiscountDetailView />;
}
