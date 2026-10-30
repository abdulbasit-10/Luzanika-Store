import { Minus, Plus } from "lucide-react";

import { cn } from "@/utils/cn";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

const buttonClass =
  "flex size-10 items-center justify-center text-foreground transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:opacity-30 disabled:hover:opacity-30";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  className,
}: QuantityStepperProps) {
  return (
    <div
      role="group"
      aria-label="Quantity"
      className={cn(
        "flex h-12 items-center justify-between rounded-sm bg-panel px-1",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={buttonClass}
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <output aria-live="polite" className="text-base font-medium">
        {value}
      </output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={buttonClass}
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}
