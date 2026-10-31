import type { Metadata } from "next";

import { ForgotPasswordPanel } from "@/features/auth/forgot-password-panel";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Get a link to reset your Luzanika password.",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-gutter py-8 lg:min-h-[calc(100dvh-var(--header-height))] lg:py-10">
      <ForgotPasswordPanel />
    </main>
  );
}
