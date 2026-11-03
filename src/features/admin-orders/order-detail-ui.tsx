"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { toast } from "@/components/ui/toaster";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/utils/cn";

/** A white-on-cream block of the order page, with a small title. */
export function DetailCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-panel p-[clamp(0.75rem,1.8dvh,1.25rem)]",
        className,
      )}
    >
      <div className="mb-[clamp(0.5rem,1.4dvh,0.875rem)] flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A label above its value, for the small facts. */
export function Fact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words text-foreground">{children}</dd>
    </div>
  );
}

export const inputClass =
  "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-[invalid=true]:border-danger";

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The API's own words for a refusal (a field message first), or a plain fallback for a network failure. */
export function apiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const field = error.fields ? Object.values(error.fields)[0] : undefined;
    return field ?? error.message;
  }
  return "Something went wrong. Please try again.";
}

/** The red line under a form when the server said no. */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-danger">
      {apiMessage(error)}
    </p>
  );
}

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
