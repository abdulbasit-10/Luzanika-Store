"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { profileButtonClass } from "@/features/account/profile-fields";
import { deleteAccount, type AuthUser } from "@/features/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";

export function DeleteAccount({ user }: { user: AuthUser }) {
  const router = useRouter();
  const clear = useAuthStore((state) => state.clear);
  const [open, setOpen] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () => deleteAccount(user.id),
    onSuccess: () => {
      clear();
      setOpen(false);
      toast.success("Your account has been deleted.");
      router.push("/");
    },
    onError: () =>
      toast.error("Couldn't delete your account. Please try again."),
  });

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
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => mutate()}
        pending={isPending}
        title="Delete your account?"
        description="This permanently removes your account and saved details. It can't be undone."
        confirmLabel="Delete account"
        pendingLabel="Deleting…"
      />
    </>
  );
}
