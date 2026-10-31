import { Minus, Plus } from "lucide-react";

import { cn } from "@/utils/cn";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** "outlined" is the compact, bordered, transparent version used in the cart. */
  variant?: "filled" | "outlined";
  className?: string;
}

const buttonClass =
  "flex items-center justify-center text-foreground transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:opacity-30 disabled:hover:opacity-30";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  variant = "filled",
  className,
}: QuantityStepperProps) {
  const outlined = variant === "outlined";
  const stepButtonClass = cn(buttonClass, outlined ? "size-8" : "size-10");

  return (
    <div
      role="group"
      aria-label="Quantity"
      className={cn(
        "flex items-center justify-between",
        outlined
          ? "h-9 rounded-lg border border-foreground px-0.5"
          : "h-12 rounded-sm bg-panel px-1",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={stepButtonClass}
      >
        <Minus aria-hidden className={outlined ? "size-3.5" : "size-4"} />
      </button>
      <output
        aria-live="polite"
        className={cn("font-medium", outlined ? "text-sm" : "text-base")}
      >
        {value}
      </output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={stepButtonClass}
      >
        <Plus aria-hidden className={outlined ? "size-3.5" : "size-4"} />
      </button>
    </div>
  );
}
