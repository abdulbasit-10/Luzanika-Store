"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { getSafeNextPath } from "@/features/auth/next-path";
import { useHydrated } from "@/hooks/use-hydrated";
import { useAuthStore } from "@/stores/auth-store";

/** The page to return to after logging in, from ?next=. Null when there is none. */
export function useNextPath() {
  return getSafeNextPath(useSearchParams().get("next"));
}

/**
 * Sends a signed-in visitor to the page they came from (or home). It also
 * runs right after a successful login or sign up, so the forms only have to
 * save the user. Returns true while the visitor is signed in, so the page can
 * hide its form.
 */
export function useRedirectWhenSignedIn() {
  const router = useRouter();
  const hydrated = useHydrated();
  const next = useNextPath();
  const signedIn = useAuthStore((state) => state.user !== null);
  const redirecting = hydrated && signedIn;

  useEffect(() => {
    if (redirecting) router.replace(next ?? "/");
  }, [redirecting, next, router]);

  return redirecting;
}
