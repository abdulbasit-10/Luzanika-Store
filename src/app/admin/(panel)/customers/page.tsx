import type { Metadata } from "next";

import { AdminCustomersView } from "@/features/admin-customers/admin-customers-view";

export const metadata: Metadata = { title: "Customers" };

export const instant = false;

export default function AdminCustomersPage() {
  return <AdminCustomersView />;
}
