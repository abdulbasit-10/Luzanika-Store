"use client";

import { useMutation } from "@tanstack/react-query";

import { updateProfile } from "@/features/auth/auth-service";
import {
  useHandleSessionExpired,
  useSetUser,
} from "@/features/auth/use-session";

/**
 * Saves a change to the signed-in user's profile and keeps the signed-in user
 * in step with it. If the session has ended it signs the visitor out and sends
 * them to log in again (callers should not show their own error for that case,
 * see isSessionEnded).
 */
export function useUpdateProfile() {
  const setUser = useSetUser();
  const handleSessionExpired = useHandleSessionExpired();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: setUser,
    onError: (error) => {
      handleSessionExpired(error);
    },
  });
}
