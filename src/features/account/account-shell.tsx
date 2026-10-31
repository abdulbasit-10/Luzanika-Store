"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AccountSidebar } from "@/features/account/account-sidebar";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAuthStore } from "@/stores/auth-store";

const pad = "px-(--page-pad) lg:px-[clamp(1.5rem,3.8vw,3.4rem)]";
const columns = "lg:grid lg:grid-cols-[clamp(15rem,24vw,21.5rem)_1fr]";

/*
 * Frame for the account pages: the links on a white column, the page on the
 * grey area. Visitors who are not signed in are sent to the login page and
 * brought back afterwards. With the real backend the server will also refuse
 * these pages without a session cookie; this check only decides what to show.
 */
export function AccountShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const signedIn = useAuthStore((state) => state.user !== null);
  const ready = hydrated && signedIn;

  // Runs when the page loads or changes, not when the visitor logs out, so a
  // logout that is heading to the home page is not turned into a login redirect.
  useEffect(() => {
    if (hydrated && !useAuthStore.getState().user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, pathname, router]);

  return (
    <main
      aria-busy={!ready}
      className={`flex flex-1 flex-col lg:min-h-[calc(100dvh-var(--header-height))] ${columns}`}
    >
      <aside
        className={`bg-surface py-4 ${pad} lg:py-[clamp(0.75rem,3.2dvh,3.4rem)]`}
      >
        {ready ? <AccountSidebar /> : <SidebarSkeleton />}
      </aside>
      <div
        className={`${pathname === "/account" ? "bg-background" : "bg-muted"} py-6 ${pad} lg:py-[clamp(0.75rem,3.2dvh,3.4rem)]`}
      >
        {ready ? null : <ContentSkeleton />}
        {/* Always rendered so the page is part of the server HTML; hidden until the visitor is known to be signed in. */}
        <div hidden={!ready}>{children}</div>
      </div>
    </main>
  );
}

function SidebarSkeleton() {
  return (
    <div role="status" className="animate-pulse space-y-4">
      <div className="h-11 rounded-md bg-black/10" />
      <div className="h-11 rounded-md bg-black/5" />
      <div className="h-11 rounded-md bg-black/5" />
      <span className="sr-only">Loading your account…</span>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div
      aria-hidden
      className="mx-auto h-96 max-w-[980px] animate-pulse rounded-2xl bg-white"
    />
  );
}
