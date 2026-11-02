"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { useAuthStore } from "@/stores/auth-store";

/** Where the header's account icon goes: the account page when signed in, otherwise the login page. */
export function useAccountHref() {
  const hydrated = useHydrated();
  const signedIn = useAuthStore((state) => state.user !== null);
  return hydrated && signedIn ? "/account" : "/login";
}
