import type { Metadata } from "next";

import { AdminProductsView } from "@/features/admin-products/admin-products-view";

export const metadata: Metadata = { title: "Products" };

export const instant = false;

export default function AdminProductsPage() {
  return <AdminProductsView />;
}
