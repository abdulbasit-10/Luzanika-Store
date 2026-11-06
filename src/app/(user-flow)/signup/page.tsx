import type { Metadata } from "next";
import { Suspense } from "react";

import { SignupPanel } from "@/features/auth/signup-panel";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your Luzanika account.",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-gutter py-6 lg:min-h-[calc(100dvh-var(--header-height))] lg:py-[clamp(0.75rem,2.2dvh,2.5rem)]">
      <Suspense>
        <SignupPanel />
      </Suspense>
    </main>
  );
}
