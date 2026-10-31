import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordPanel } from "@/features/auth/reset-password-panel";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Choose a new password for your Luzanika account.",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-gutter py-8 lg:min-h-[calc(100dvh-var(--header-height))] lg:py-10">
      <Suspense>
        <ResetPasswordPanel />
      </Suspense>
    </main>
  );
}
