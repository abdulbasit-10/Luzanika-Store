import type { Metadata } from "next";

import { AdminStaffView } from "@/features/admin-staff/admin-staff-view";

export const metadata: Metadata = { title: "Staff & roles" };

export const instant = false;

export default function AdminStaffPage() {
  return <AdminStaffView />;
}
