import type { Metadata } from "next";

import { AdminShell } from "@/features/admin-shell/admin-shell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Luzanika Admin" },
  robots: { index: false, follow: false },
};

/**
 * Every page here sits behind the sign-in check (AdminShell shows "Loading…"
 * until the session is known), so none of them can be an instant navigation.
 */
export const instant = false;

export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
