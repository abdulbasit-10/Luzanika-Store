"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

import { toast } from "@/components/ui/toaster";
import { AuthError, type AuthUser } from "@/features/auth/auth-service";
import { ME_QUERY_KEY } from "@/features/auth/auth-sync";
import { useAuthStore } from "@/stores/auth-store";

/** Puts the user in the store and the cached "who am I" answer (after a login, sign up, or any change to the profile). */
export function useSetUser() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useCallback(
    (user: AuthUser) => {
      queryClient.setQueryData(ME_QUERY_KEY, user);
      setUser(user);
    },
    [queryClient, setUser],
  );
}

/** Marks the visitor as signed in (after a successful login or sign up). */
export const useSignIn = useSetUser;

/** Marks the visitor as signed out (after the server ended the session). */
export function useSignOut() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((state) => state.clear);

  return useCallback(() => {
    queryClient.setQueryData(ME_QUERY_KEY, null);
    // Nothing the signed-in customer loaded may linger for whoever uses this browser next.
    queryClient.removeQueries({ queryKey: ["addresses"] });
    clear();
  }, [queryClient, clear]);
}

/**
 * For a request that failed because the session has ended (idle for 30 days,
 * or signed out from another device). Tells the visitor, signs them out here
 * and sends them to the login page, returning to this page afterwards.
 * Returns true when it handled the error, so the caller can skip its own message.
 */
export function useHandleSessionExpired() {
  const router = useRouter();
  const pathname = usePathname();
  const signOut = useSignOut();

  return useCallback(
    (error: unknown): boolean => {
      if (!(error instanceof AuthError) || error.code !== "unauthenticated") {
        return false;
      }
      signOut();
      toast.info("Your session has ended. Please log in again.", {
        id: "session-ended",
      });
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return true;
    },
    [pathname, router, signOut],
  );
}
