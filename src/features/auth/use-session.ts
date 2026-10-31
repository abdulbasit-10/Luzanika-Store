"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { ME_QUERY_KEY } from "@/features/auth/auth-sync";
import type { AuthUser } from "@/features/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";

/** Marks the visitor as signed in (after a successful login or sign up), in the store and the cached "who am I" answer. */
export function useSignIn() {
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

/** Marks the visitor as signed out (after the server ended the session). */
export function useSignOut() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((state) => state.clear);

  return useCallback(() => {
    queryClient.setQueryData(ME_QUERY_KEY, null);
    clear();
  }, [queryClient, clear]);
}
