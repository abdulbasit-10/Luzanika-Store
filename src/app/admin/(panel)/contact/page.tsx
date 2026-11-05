import type { Metadata } from "next";

import { AdminContactView } from "@/features/admin-contact/admin-contact-view";

export const metadata: Metadata = { title: "Contact Us" };

export const instant = false;

export default function AdminContactPage() {
  return <AdminContactView />;
}
