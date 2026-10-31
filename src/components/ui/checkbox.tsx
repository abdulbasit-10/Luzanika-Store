import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/utils/cn";

interface CheckboxProps extends Omit<ComponentProps<"input">, "type"> {
  /** Omit for a bare box; then pass `aria-label` so it still has a name. */
  label?: ReactNode;
}

/** Native checkbox (keyboard and screen-reader friendly) with a custom box. */
export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 text-sm leading-5 text-muted-foreground",
        className,
      )}
    >
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className="mt-px flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border border-muted-foreground/60 text-primary-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
      >
        <Check strokeWidth={3} className="size-3" />
      </span>
      {label ? (
        <span className="peer-checked:text-foreground">{label}</span>
      ) : null}
    </label>
  );
}
