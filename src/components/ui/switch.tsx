import { Lock } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

interface SwitchProps extends Omit<
  ComponentProps<"button">,
  "onChange" | "role"
> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Shows a lock on the knob: the setting is on and cannot be changed. */
  locked?: boolean;
}

export function Switch({
  checked,
  onCheckedChange,
  locked,
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={locked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative h-[18px] w-8 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        checked ? "bg-[#5b5047]" : "bg-[#e6e3df]",
        locked && "cursor-not-allowed",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-0.5 flex size-3.5 items-center justify-center rounded-full bg-white shadow-sm transition-[left]",
          checked ? "left-[calc(100%-1rem)]" : "left-0.5",
        )}
      >
        {locked ? <Lock className="size-2 text-[#5b5047]" /> : null}
      </span>
    </button>
  );
}
