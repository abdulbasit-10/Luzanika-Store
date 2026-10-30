import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

type PillSize = "sm" | "md";

interface PillOptions {
  active?: boolean;
  size?: PillSize;
  className?: string;
}

/**
 * Rounded uppercase pill. "md" is the outlined subcategory chip, "sm" is the
 * compact department tab where inactive items are plain text.
 */
export function pillStyles({ active, size = "md", className }: PillOptions) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium tracking-wide whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    size === "md"
      ? "border px-5 py-2.5 text-xs uppercase xl:px-7"
      : "px-3.5 py-1.5 text-xs",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : size === "md"
        ? "border-white/70 text-foreground hover:bg-white/40"
        : "text-foreground hover:bg-foreground/10",
    className,
  );
}

export function FilterPill({
  active,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & PillOptions) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={pillStyles({ active, size, className })}
      {...props}
    />
  );
}

export function FilterPillLink({
  active,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & PillOptions) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={pillStyles({ active, size, className })}
      {...props}
    />
  );
}
