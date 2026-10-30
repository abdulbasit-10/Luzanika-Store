import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  /** Extra classes for the label, e.g. a custom size. */
  labelClassName?: string;
  children: ReactNode;
}

/** Label + control + error message. The control must set `id`, `aria-invalid` and `aria-describedby={`${id}-error`}`. */
export function FormField({
  id,
  label,
  error,
  labelClassName,
  children,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className={cn(
          "font-button text-base font-medium lg:text-lg",
          labelClassName,
        )}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
