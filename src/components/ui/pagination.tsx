import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/utils/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

type PageItem = number | "ellipsis-start" | "ellipsis-end";

/** All pages when there are few, otherwise first, last and the pages around the current one. */
function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const items: PageItem[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push("ellipsis-start");
  for (let current = start; current <= end; current++) items.push(current);
  if (end < totalPages - 1) items.push("ellipsis-end");
  items.push(totalPages);
  return items;
}

const buttonClass =
  "flex size-9 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40";

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className={className}>
      <ul className="flex items-center justify-center gap-1.5">
        <li>
          <button
            type="button"
            aria-label="Previous page"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            className={cn(buttonClass, "hover:bg-foreground/10")}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
        </li>
        {getPageItems(page, totalPages).map((item) =>
          typeof item === "number" ? (
            <li key={item}>
              <button
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  buttonClass,
                  item === page
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-foreground/10",
                )}
              >
                {item}
              </button>
            </li>
          ) : (
            <li key={item} aria-hidden className="px-1 text-muted-foreground">
              …
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            aria-label="Next page"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            className={cn(buttonClass, "hover:bg-foreground/10")}
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
