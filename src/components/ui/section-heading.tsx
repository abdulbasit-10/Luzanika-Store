import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

interface SectionHeadingProps {
  title: ReactNode;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  /** Overrides the spacing of the eyebrow / title / description stack. */
  contentClassName?: string;
}

export function SectionHeading({
  title,
  eyebrow,
  description,
  action,
  className,
  titleClassName,
  descriptionClassName,
  contentClassName,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div className={cn("flex flex-col gap-3", contentClassName)}>
        {eyebrow ? (
          <p className="flex items-center gap-3 font-heading text-xs font-medium tracking-[0.2em] text-accent uppercase">
            <span aria-hidden className="h-px w-8 bg-accent" />
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cn(
            "max-w-xl font-heading text-3xl leading-tight font-bold lg:text-[40px]",
            titleClassName,
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className={cn("text-sm text-foreground", descriptionClassName)}>
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
