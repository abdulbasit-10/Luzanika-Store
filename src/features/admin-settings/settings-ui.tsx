"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { toast } from "@/components/ui/toaster";
import { FormError } from "@/features/admin-orders/order-detail-ui";

import {
  saveAdminSettings,
  type SettingsPatch,
} from "./admin-settings-service";

/** Saves a part of the settings, says so, and loads the saved values again. */
export function useSaveSettings(successMessage: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => saveAdminSettings(patch),
    onSuccess: async () => {
      toast.success(successMessage);
      await queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

/** The Save button and the red line under a settings form. */
export function SaveBar({
  canEdit,
  pending,
  error,
  children,
}: {
  canEdit: boolean;
  pending: boolean;
  error: unknown;
  children?: ReactNode;
}) {
  if (!canEdit) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        You can view these settings but not change them.
      </p>
    );
  }
  return (
    <div className="mt-3">
      {children}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
      <FormError error={error} />
    </div>
  );
}
