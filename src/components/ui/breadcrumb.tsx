import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/utils/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({
  items,
  plain,
  className,
}: {
  items: BreadcrumbItem[];
  /** Regular-case 15px text instead of the small uppercase default (products page). */
  plain?: boolean;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        className={cn(
          "flex flex-wrap items-center gap-2",
          plain ? "text-[15px]" : "text-xs",
        )}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className="text-accent hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "text-foreground",
                    !plain && "tracking-wide uppercase",
                  )}
                >
                  {item.label}
                </span>
              )}
              {isLast ? null : (
                <ChevronRight
                  aria-hidden
                  className={cn("size-3 text-muted-foreground")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
