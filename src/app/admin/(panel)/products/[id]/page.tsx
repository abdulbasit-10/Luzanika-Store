import type { Metadata } from "next";

import { AdminProductDetailView } from "@/features/admin-products/product-detail-view";

export const metadata: Metadata = { title: "Product" };

export const instant = false;

export default async function AdminProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  return <AdminProductDetailView id={decodeURIComponent(id)} />;
}
