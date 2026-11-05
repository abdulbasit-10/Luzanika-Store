import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminNewPasswordPanel } from "@/features/admin-auth/admin-new-password-panel";

export const metadata: Metadata = {
  title: "Admin Invitation",
  description: "Accept your invitation to the Luzanika admin.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense>
      <AdminNewPasswordPanel kind="invite" />
    </Suspense>
  );
}
