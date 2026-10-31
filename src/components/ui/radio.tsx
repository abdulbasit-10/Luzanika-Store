import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/utils/cn";

interface RadioProps extends Omit<ComponentProps<"input">, "type"> {
  label: ReactNode;
}

/** Native radio (keyboard and screen-reader friendly) with a custom round box. */
export function Radio({ label, className, ...props }: RadioProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground",
        className,
      )}
    >
      <input type="radio" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className="flex size-[18px] shrink-0 items-center justify-center rounded-full border border-muted-foreground/60 transition-colors peer-checked:border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-checked:[&>span]:scale-100"
      >
        <span className="size-2.5 scale-0 rounded-full bg-primary transition-transform" />
      </span>
      <span className="peer-checked:text-foreground">{label}</span>
    </label>
  );
}
