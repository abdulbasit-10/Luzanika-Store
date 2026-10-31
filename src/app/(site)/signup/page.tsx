import type { Metadata } from "next";

import { SignupPanel } from "@/features/auth/signup-panel";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your Luzanika account.",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-gutter py-8 lg:min-h-[calc(100dvh-var(--header-height))] lg:py-10">
      <SignupPanel />
    </main>
  );
}
