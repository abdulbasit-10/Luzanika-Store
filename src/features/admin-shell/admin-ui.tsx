"use client";

import { Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api-client";
import { cn } from "@/utils/cn";

/** A cream block of an admin page, with a small title and an optional action on the right. */
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
  "h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-[invalid=true]:border-danger disabled:opacity-60";

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
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

/** The server's message for one field of a form, when it named that field. */
export function fieldError(error: unknown, field: string): string | undefined {
  return error instanceof ApiError ? error.fields?.[field] : undefined;
}

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-[clamp(0.4rem,1.2dvh,0.625rem)] text-sm font-semibold text-white hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60";

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-[clamp(0.4rem,1.2dvh,0.625rem)] text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60";

export const headCell =
  "h-[clamp(2rem,4.8dvh,2.5rem)] border-r border-b border-border bg-background px-4 text-left text-[0.8125rem] font-medium tracking-[0.3px] whitespace-nowrap text-[#737373] uppercase last:border-r-0";
export const bodyCell =
  "h-[clamp(2.25rem,6.2dvh,3.5rem)] border-r border-b border-border bg-panel px-4 text-sm last:border-r-0";

/** The white card that holds a table and its page buttons, filling the visible height. */
export const tableCardClass =
  "flex min-h-[12rem] flex-[0_1_auto] flex-col overflow-hidden rounded-xl bg-white shadow-[0_4px_8px_-5px_rgba(0,0,0,0.15),0_0_0_1px_#e5e5e5]";

/** The cream box every filter sits in. */
export const filterBoxClass =
  "flex h-[clamp(2.25rem,5.6dvh,2.7rem)] items-center rounded-[9px] bg-panel text-sm";

/** The white bordered bar under a page title that holds the filters. */
export const filterBarClass =
  "rounded-[11px] border border-muted-foreground bg-white p-[clamp(0.5rem,1.6dvh,1.2rem)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]";

/** The search box of a filter bar. */
export function SearchBox({
  label,
  placeholder,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn(filterBoxClass, "relative", className)}>
      <span className="sr-only">{label}</span>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.5}
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full w-full rounded-[9px] bg-transparent pr-4 pl-12 text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      />
    </label>
  );
}

/** Gives back `value` only after it has stopped changing for a moment. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

/** Text a screen shows instead of rows (loading, an error, nothing found). */
export function TableMessage({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="bg-panel px-4 py-8 text-center text-sm text-muted-foreground"
    >
      {children}
    </p>
  );
}
