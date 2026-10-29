import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-page px-gutter min-[1344px]:px-0 sm:px-8",
        className,
      )}
      {...props}
    />
  );
}
