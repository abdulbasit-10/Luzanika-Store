"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { DeleteAccountIllustration } from "@/features/account/delete-account-illustration";
import { forgetUserData } from "@/features/account/forget-user-data";
import { PasswordConfirmDialog } from "@/features/account/password-confirm-dialog";
import { profileButtonClass } from "@/features/account/profile-fields";
import {
  AuthError,
  deleteAccount,
  isSessionEnded,
  type AuthUser,
} from "@/features/auth/auth-service";
import {
  useHandleSessionExpired,
  useSignOut,
} from "@/features/auth/use-session";

export function DeleteAccount({ user }: { user: AuthUser }) {
  const router = useRouter();
  const signOut = useSignOut();
  const handleSessionExpired = useHandleSessionExpired();
  const [open, setOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      forgetUserData(user.id);
      signOut();
      setOpen(false);
      toast.success("Your account has been deleted.");
      router.push("/");
    },
    onError: (failure) => {
      if (isSessionEnded(failure)) {
        handleSessionExpired(failure);
        return;
      }
      if (failure instanceof AuthError) {
        if (failure.fields?.password) {
          setPasswordError(failure.fields.password);
          return;
        }
        if (failure.code === "rate_limited") {
          setPasswordError(
            "Too many attempts. Please wait a few minutes and try again.",
          );
          return;
        }
      }
      setOpen(false);
      toast.error("Couldn't delete your account. Please try again.");
    },
  });

  function close() {
    setOpen(false);
    setPasswordError(null);
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className={`${profileButtonClass} rounded-md border-danger px-4 text-sm font-medium text-danger hover:bg-danger/5`}
      >
        Delete account
      </Button>
      <PasswordConfirmDialog
        open={open}
        onClose={close}
        onConfirm={(password) => {
          setPasswordError(null);
          mutate(password);
        }}
        pending={isPending}
        error={passwordError}
        illustration={
          <DeleteAccountIllustration className="h-[clamp(5rem,18dvh,9rem)] w-auto" />
        }
        title="Delete Account?"
        description="This permanently deletes your account and personal details, and cannot be undone. Enter your password to confirm."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
      />
    </>
  );
}
