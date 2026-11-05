import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminForgotPasswordPanel } from "@/features/admin-auth/admin-forgot-password-panel";

export const metadata: Metadata = {
  title: "Admin Forgot Password",
  description: "Reset your Luzanika admin password.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense>
      <AdminForgotPasswordPanel />
    </Suspense>
  );
}
