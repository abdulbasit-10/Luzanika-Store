import type { Metadata } from "next";

import { AdminAuditView } from "@/features/admin-audit/admin-audit-view";

export const metadata: Metadata = { title: "Audit log" };

export const instant = false;

export default function AdminAuditPage() {
  return <AdminAuditView />;
}
