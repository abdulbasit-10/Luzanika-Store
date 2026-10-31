import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

interface SelectProps extends Omit<ComponentProps<"select">, "size"> {
  /** Visible text before the control, e.g. "Sort By:". */
  label: string;
  /** "lg" is the larger toolbar version used on the products page. */
  size?: "sm" | "lg";
}

/** Native select (works with keyboard, mobile pickers and screen readers) with a custom chevron. */
export function Select({
  label,
  size = "sm",
  className,
  children,
  ...props
}: SelectProps) {
  const large = size === "lg";

  return (
    <label
      className={cn(
        "flex items-center",
        large ? "gap-5 text-base" : "gap-3 text-xs",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="relative">
        <select
          className={cn(
            "appearance-none rounded-md border bg-surface font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            large
              ? "h-11 border-foreground/25 pr-9 pl-4 text-sm"
              : "h-10 border-border pr-9 pl-4 text-xs",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2"
        />
      </span>
    </label>
  );
}
