import type { Metadata } from "next";
import Image from "next/image";

import { Logo } from "@/components/shared/logo";
import { LoginPanel } from "@/features/auth/login-panel";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your Luzanika account.",
  robots: { index: false },
};

/*
 * Full-screen split layout from the Figma: photo on the left, form on the
 * right, with no header or footer. The photo is hidden below lg.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-background lg:grid lg:grid-cols-2 lg:p-[clamp(0.75rem,1.5vw,1.5rem)]">
      <div className="relative hidden overflow-hidden rounded-xl lg:block">
        <Image
          src="/images/auth/login.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover object-[35%_50%]"
        />
        <Logo size="lg" className="absolute bottom-8 left-8" />
      </div>

      <div className="flex flex-1 flex-col px-gutter lg:px-[clamp(1.5rem,4vw,4rem)]">
        <Logo className="py-5 lg:hidden" />
        <div className="flex flex-1 items-center justify-center pt-4 pb-10 lg:py-8">
          <LoginPanel />
        </div>
      </div>
    </main>
  );
}
