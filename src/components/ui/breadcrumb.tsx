import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/utils/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-2 text-xs">
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
                  className="tracking-wide text-foreground uppercase"
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
