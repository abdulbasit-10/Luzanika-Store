import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminLoginView } from "@/features/admin-auth/admin-login-panel";

export const metadata: Metadata = {
  title: "Admin Log In",
  description: "Sign in to the Luzanika admin.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense>
      <AdminLoginView />
    </Suspense>
  );
}
