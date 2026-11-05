"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui/toaster";

// The building blocks shared by every admin screen live in admin-shell.
export {
  DetailCard,
  Fact,
  Field,
  FormError,
  apiMessage,
  inputClass,
} from "@/features/admin-shell/admin-ui";

/**
 * Runs one change to an order. On success it says so and refreshes the order,
 * the orders list and the dashboard, because all three show what changed.
 */
export function useOrderMutation<Variables>(
  number: string,
  run: (variables: Variables) => Promise<unknown>,
  successMessage: string,
  onDone?: () => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async () => {
      toast.success(successMessage);
      onDone?.();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "order", number] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
      ]);
    },
  });
}

export const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
