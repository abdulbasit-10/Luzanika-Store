import type { Metadata } from "next";

import { AdminProductNewView } from "@/features/admin-products/product-new-view";

export const metadata: Metadata = { title: "New product" };

export const instant = false;

export default function AdminProductNewPage() {
  return <AdminProductNewView />;
}
