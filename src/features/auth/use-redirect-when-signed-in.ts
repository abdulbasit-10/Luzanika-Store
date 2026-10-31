"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useHydrated } from "@/hooks/use-hydrated";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Sends a signed-in visitor to the home page. It also runs right after a
 * successful login or sign up, so the forms only have to save the user.
 * Returns true while the visitor is signed in, so the page can hide its form.
 */
export function useRedirectWhenSignedIn() {
  const router = useRouter();
  const hydrated = useHydrated();
  const signedIn = useAuthStore((state) => state.user !== null);
  const redirecting = hydrated && signedIn;

  useEffect(() => {
    if (redirecting) router.replace("/");
  }, [redirecting, router]);

  return redirecting;
}
