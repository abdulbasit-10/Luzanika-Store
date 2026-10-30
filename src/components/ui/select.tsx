import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

interface SelectProps extends ComponentProps<"select"> {
  /** Visible text before the control, e.g. "Sort By:". */
  label: string;
}

/** Native select (works with keyboard, mobile pickers and screen readers) with a custom chevron. */
export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <label className="flex items-center gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="relative">
        <select
          className={cn(
            "h-10 appearance-none rounded-md border border-border bg-surface pr-9 pl-4 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
