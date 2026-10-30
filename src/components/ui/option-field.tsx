import { X } from "lucide-react";
import { useId, type ReactNode } from "react";

import { cn } from "@/utils/cn";

interface OptionFieldProps {
  legend: string;
  children: ReactNode;
  onClear: () => void;
  hasSelection: boolean;
  className?: string;
}

/** Shared frame for the product option pickers: a label with an inline "Clear" button, then the options. */
export function OptionField({
  legend,
  children,
  onClear,
  hasSelection,
  className,
}: OptionFieldProps) {
  const labelId = useId();

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className={cn("flex flex-col", className)}
    >
      <div className="mb-1.5 flex min-h-4 items-center justify-between gap-4">
        <span id={labelId} className="text-[11px] text-muted-foreground">
          {legend}
        </span>
        {hasSelection ? (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X aria-hidden className="size-3" />
            Clear
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
