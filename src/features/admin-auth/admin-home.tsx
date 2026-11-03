"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { ADMIN_SESSION_KEY } from "@/features/admin-auth/admin-login-panel";
import {
  fetchAdminSession,
  logoutStaff,
} from "@/features/admin-auth/admin-auth-service";

/**
 * Where signing in lands, until the dashboard screens exist. It only needs a
 * finished sign-in: anyone else is sent to the sign-in page.
 */
export function AdminHome() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const signOut = useMutation({
    mutationFn: logoutStaff,
    onSettled: () => {
      queryClient.clear();
      router.replace("/admin/login");
    },
  });

  if (session.data?.state !== "signed_in") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white">
        <p role="status" className="text-sm text-muted-foreground">
          {session.isError ? "We couldn't load your session." : "Loading…"}
        </p>
      </main>
    );
  }

  const { staff } = session.data;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white px-4 text-center">
      <h1 className="text-2xl font-semibold">
        Welcome, {staff.firstName} {staff.lastName}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        You are signed in to the Luzanika admin as {staff.email}. The dashboard
        and order screens are coming next.
      </p>
      <Button
        variant="secondary"
        onClick={() => signOut.mutate()}
        disabled={signOut.isPending}
        className="rounded-lg px-6 py-2.5 text-sm"
      >
        {signOut.isPending ? "Signing out…" : "Sign out"}
      </Button>
    </main>
  );
}
