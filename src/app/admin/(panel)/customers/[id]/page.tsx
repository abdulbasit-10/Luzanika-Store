import type { Metadata } from "next";

import { AdminCustomerDetailView } from "@/features/admin-customers/customer-detail-view";

export const metadata: Metadata = { title: "Customer" };

export const instant = false;

export default async function AdminCustomerPage({
  params,
}: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  return <AdminCustomerDetailView id={decodeURIComponent(id)} />;
}
