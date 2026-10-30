import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

export function Container({ className, ...props }: ComponentProps<"div">) {
  // Max width is the 80rem content width plus the side padding, so content stays 1280px wide on large screens.
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[calc(80rem+2*var(--page-pad))] px-(--page-pad)",
        className,
      )}
      {...props}
    />
  );
}
