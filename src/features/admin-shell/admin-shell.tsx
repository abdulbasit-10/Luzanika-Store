"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ADMIN_SESSION_KEY } from "@/features/admin-auth/admin-login-panel";
import { fetchAdminSession } from "@/features/admin-auth/admin-auth-service";

import { AdminHeader } from "./admin-header";
import { AdminMarketProvider } from "./admin-market";
import { AdminSessionProvider } from "./admin-session";
import { AdminSidebar } from "./admin-sidebar";

function Notice({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white px-4 text-center">
      {children}
    </main>
  );
}

/**
 * The frame of every signed-in admin page: header, sidebar and the page
 * itself. Anyone without a finished sign-in is sent to the sign-in page, and
 * the sidebar only lists what their permissions allow.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const session = useQuery({
    queryKey: ADMIN_SESSION_KEY,
    queryFn: fetchAdminSession,
    retry: 1,
  });

  const state = session.data?.state;
  useEffect(() => {
    if (state === "signed_out" || state === "pending") {
      router.replace("/admin/login");
    }
  }, [state, router]);

  if (session.data?.state !== "signed_in") {
    if (session.isError) {
      return (
        <Notice>
          <p role="alert" className="text-sm text-muted-foreground">
            We couldn&apos;t load your session.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void session.refetch()}
          >
            Try again
          </Button>
        </Notice>
      );
    }
    return (
      <Notice>
        <p role="status" className="text-sm text-muted-foreground">
          Loading…
        </p>
      </Notice>
    );
  }

  return (
    <AdminSessionProvider session={session.data}>
      <AdminMarketProvider>
        <div className="flex h-dvh flex-col overflow-hidden bg-white">
          <AdminHeader
            menuOpen={menuOpen}
            onToggleMenu={() => setMenuOpen((open) => !open)}
          />
          <div className="relative flex min-h-0 flex-1">
            <AdminSidebar
              open={menuOpen}
              onNavigate={() => setMenuOpen(false)}
            />
            {menuOpen ? (
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="absolute inset-0 z-20 bg-black/40 lg:hidden"
              />
            ) : null}
            <main className="relative min-w-0 flex-1 overflow-y-auto px-[clamp(1rem,3vw,3.3rem)] py-[clamp(0.625rem,1.8dvh,1.75rem)]">
              {children}
            </main>
          </div>
        </div>
      </AdminMarketProvider>
    </AdminSessionProvider>
  );
}

/** Title and sentence at the top of every admin page. */
export function AdminPageHead({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h1 className="text-[clamp(1.25rem,3.8dvh,2rem)] leading-tight font-semibold tracking-[-0.5px] text-[#151d2b]">
        {title}
      </h1>
      <p className="text-[clamp(0.875rem,2.2dvh,1rem)] text-[#6f7b8c]">
        {subtitle}
      </p>
    </div>
  );
}
