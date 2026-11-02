"use client";

import { useMutation } from "@tanstack/react-query";

import {
  AuthError,
  updateProfile,
  type ProfilePatch,
} from "@/features/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";

/** Saves a change to the signed-in user's profile and keeps the session user in step with it. */
export function useUpdateProfile() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (patch: ProfilePatch) => {
      if (!user) throw new AuthError("account_not_found");
      return updateProfile(user.id, patch);
    },
    onSuccess: (updated) => setUser(updated),
  });
}
