import type { ReactNode, Ref } from "react";

import { ProductGrid } from "@/components/shared/product-grid";
import { Pagination } from "@/components/ui/pagination";
import type { ViewMode } from "@/features/catalog/types";
import type { ProductSummary } from "@/types/product";

interface CatalogResultsProps {
  items: ProductSummary[];
  /** Products matching every filter, across all pages. */
  total: number;
  /** Products shown up to and including this page. */
  shown: number;
  page: number;
  totalPages: number;
  view: ViewMode;
  onPageChange: (page: number) => void;
  /** Shown instead of the grid when there are no products. */
  empty: ReactNode;
  listRef?: Ref<HTMLDivElement>;
}

/** The cream panel of the listing pages: product grid, "showing X of Y" bar and pagination. */
export function CatalogResults({
  items,
  total,
  shown,
  page,
  totalPages,
  view,
  onPageChange,
  empty,
  listRef,
}: CatalogResultsProps) {
  return (
    <div
      ref={listRef}
      className="scroll-mt-[calc(var(--header-height)+1rem)] rounded-xl bg-panel p-5 sm:p-8 xl:px-11 xl:pt-14 xl:pb-11"
    >
      {items.length > 0 ? (
        <>
          <ProductGrid
            products={items}
            variant="catalog"
            layout={view}
            columnsClassName="grid-cols-2 gap-x-4 md:grid-cols-3"
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
          />
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <p aria-live="polite" className="text-xs tracking-widest uppercase">
              Showing {shown} of {total} creations
            </p>
            <div
              aria-hidden
              className="h-1 w-80 max-w-full overflow-hidden rounded-full bg-black/10"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(shown / total) * 100}%` }}
              />
            </div>
          </div>
          <Pagination
            className="mt-6"
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </>
      ) : (
        empty
      )}
    </div>
  );
}
