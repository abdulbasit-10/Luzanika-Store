import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

/** Look of a text input on the light cream cards (checkout). Set `aria-invalid` to show the error outline. */
export const fieldControlClass =
  "h-10 w-full rounded-[10px] bg-white px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:outline-2 aria-invalid:outline-danger";

interface FieldProps {
  id: string;
  label: string;
  /** Shows the red "Required" marker next to the label. */
  required?: boolean;
  /** Helper text under the control; replaced by the error when there is one. */
  hint?: string;
  error?: string;
  className?: string;
  /** Replaces the default label size and weight. */
  labelClassName?: string;
  children: ReactNode;
}

/**
 * Label, control and message for light surfaces. The control must use
 * `id`, `aria-invalid` and `aria-describedby={`${id}-message`}`.
 */
export function Field({
  id,
  label,
  required,
  hint,
  error,
  className,
  labelClassName,
  children,
}: FieldProps) {
  const message = error ?? hint;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className={cn("text-[13px] font-medium", labelClassName)}
        >
          {label}
        </label>
        {required ? (
          <span aria-hidden className="text-[11px] text-danger">
            Required
          </span>
        ) : null}
      </div>
      {children}
      {message ? (
        <p
          id={`${id}-message`}
          role={error ? "alert" : undefined}
          className={cn("text-xs", error ? "text-danger" : "text-accent")}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
