import type { Metadata } from "next";

import { AdminHome } from "@/features/admin-auth/admin-home";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminHome />;
}
