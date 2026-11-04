"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui/toaster";

/**
 * Runs one catalogue change. On success it says so and marks every list that
 * shows categories, collections or the home page as old, because the Add
 * Product pickers and the products list read them too.
 */
export function useCatalogChange<Variables, Result = unknown>(
  run: (variables: Variables) => Promise<Result>,
  message: string,
  onDone?: (result: Result) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async (result) => {
      toast.success(message);
      onDone?.(result);
      await Promise.all(
        ["categories", "collections", "home", "products"].map((key) =>
          queryClient.invalidateQueries({ queryKey: ["admin", key] }),
        ),
      );
    },
  });
}

export const linkButton =
  "text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

export const dangerLinkButton =
  "text-sm font-medium text-danger underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

export const iconButton =
  "flex size-8 items-center justify-center rounded-lg border border-border bg-white text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40";
