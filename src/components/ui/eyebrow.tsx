import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

/** Small uppercase label with a leading rule, used above section headings. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-heading text-xs font-medium tracking-[0.2em] text-accent uppercase",
        className,
      )}
    >
      <span aria-hidden className="h-px w-8 shrink-0 bg-accent" />
      {children}
    </p>
  );
}
