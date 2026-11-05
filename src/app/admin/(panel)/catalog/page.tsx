import type { Metadata } from "next";

import { AdminCatalogView } from "@/features/admin-catalog/admin-catalog-view";

export const metadata: Metadata = { title: "Catalog" };

export const instant = false;

export default function AdminCatalogPage() {
  return <AdminCatalogView />;
}
