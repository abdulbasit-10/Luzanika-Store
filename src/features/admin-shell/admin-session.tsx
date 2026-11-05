"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";

import {
  logoutStaff,
  type AdminSession,
} from "@/features/admin-auth/admin-auth-service";

export type SignedInSession = Extract<AdminSession, { state: "signed_in" }>;

const SessionContext = createContext<SignedInSession | null>(null);

/** Gives every admin screen the signed-in person and their permissions. */
export function AdminSessionProvider({
  session,
  children,
}: {
  session: SignedInSession;
  children: ReactNode;
}) {
  return <SessionContext value={session}>{children}</SessionContext>;
}

export function useAdminSession(): SignedInSession {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useAdminSession must be used inside the admin layout");
  }
  return session;
}

/** Ends the sign-in, forgets everything fetched for this person and goes back to the sign-in page. */
export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutStaff,
    onSettled: () => {
      queryClient.clear();
      router.replace("/admin/login");
    },
  });
}
