import type { Metadata } from "next";

import { AdminContactDetailView } from "@/features/admin-contact/contact-detail-view";

export const metadata: Metadata = { title: "Contact message" };

export const instant = false;

export default async function AdminContactMessagePage({
  params,
}: PageProps<"/admin/contact/[id]">) {
  const { id } = await params;
  return <AdminContactDetailView id={decodeURIComponent(id)} />;
}
