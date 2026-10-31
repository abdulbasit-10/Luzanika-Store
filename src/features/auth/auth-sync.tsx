"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getCurrentUser } from "@/features/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";

export const ME_QUERY_KEY = ["auth", "me"] as const;

/**
 * Asks the server who is signed in once when the site loads (and again when
 * the tab regains focus), and keeps the auth store in step. Renders nothing.
 */
export function AuthSync() {
  const hydrate = useAuthStore((state) => state.hydrate);

  const { data, isSuccess, dataUpdatedAt } = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getCurrentUser,
    // A signed-out answer is also a valid answer; only network/server failures retry.
    retry: 1,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  // dataUpdatedAt makes every fresh answer count, even one equal to the last (e.g. "still signed out").
  useEffect(() => {
    if (isSuccess) hydrate(data);
  }, [isSuccess, data, dataUpdatedAt, hydrate]);

  return null;
}
