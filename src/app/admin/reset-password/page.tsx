import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminNewPasswordPanel } from "@/features/admin-auth/admin-new-password-panel";

export const metadata: Metadata = {
  title: "Admin Create New Password",
  description: "Choose a new Luzanika admin password.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense>
      <AdminNewPasswordPanel kind="reset" />
    </Suspense>
  );
}
