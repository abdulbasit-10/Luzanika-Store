"use client";

import { useAuthReady, useAuthStore } from "@/stores/auth-store";

/**
 * Where the header's account icon goes: the account page when signed in,
 * otherwise the login page. Until the server has answered, the account page,
 * which sends visitors who are not signed in to the login page by itself.
 */
export function useAccountHref() {
  const ready = useAuthReady();
  const signedIn = useAuthStore((state) => state.user !== null);
  return ready && !signedIn ? "/login" : "/account";
}
