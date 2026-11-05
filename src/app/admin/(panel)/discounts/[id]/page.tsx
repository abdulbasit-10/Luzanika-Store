import type { Metadata } from "next";

import { AdminDiscountDetailView } from "@/features/admin-discounts/discount-detail-view";

export const metadata: Metadata = { title: "Discount" };

export const instant = false;

export default async function AdminDiscountPage({
  params,
}: PageProps<"/admin/discounts/[id]">) {
  const { id } = await params;
  return <AdminDiscountDetailView id={decodeURIComponent(id)} />;
}
