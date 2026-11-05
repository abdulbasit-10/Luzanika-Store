import type { Metadata } from "next";

import { AdminSettingsView } from "@/features/admin-settings/admin-settings-view";

export const metadata: Metadata = { title: "Settings" };

export const instant = false;

export default function AdminSettingsPage() {
  return <AdminSettingsView />;
}
