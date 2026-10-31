"use client";

import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Select } from "@/components/ui/select";
import { ViewToggle } from "@/components/ui/view-toggle";
import { SORT_OPTIONS } from "@/features/catalog/catalog-config";
import { CatalogResults } from "@/features/catalog/catalog-results";
import { FilterSidebar } from "@/features/catalog/filter-sidebar";
import { getDefaultFilters } from "@/features/catalog/query-catalog";
import type { SortValue, ViewMode } from "@/features/catalog/types";
import { describeActiveFilters } from "@/features/products/active-filters";
import { ProductSearchBox } from "@/features/products/product-search-box";
import {
  queryProducts,
  searchProducts,
} from "@/features/products/product-search";
import { productsPage } from "@/features/products/products-config";
import type { ProductListing } from "@/features/products/types";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/utils/cn";

const MAX_LISTED_FILTERS = 2;

function searchHref(query: string) {
  return query
    ? `/products?${new URLSearchParams({ q: query }).toString()}`
    : "/products";
}

/**
 * The all-products and search-results page. The search text lives in the URL
 * (?q=), so results can be shared and the Back button works. Filters, sort and
 * page stay in local state like the category pages; once the backend exists
 * they become query params for the API request (and TanStack Query keys).
 */
export function ProductsBrowser({ facets, products }: ProductListing) {
  const router = useRouter();
  const query = (useSearchParams().get("q") ?? "").trim();
  const region = useUiStore((state) => state.region);

  const [applied, setApplied] = useState(() => getDefaultFilters(facets));
  // The sidebar edits a draft; it only affects the list after "Apply Filters".
  const [draft, setDraft] = useState(applied);
  const [sort, setSort] = useState<SortValue>("relevance");
  const [view, setView] = useState<ViewMode>("grid");
  // The page belongs to one search, so a new search starts on page 1.
  const [pageState, setPageState] = useState({ query, page: 1 });
  const page = pageState.query === query ? pageState.page : 1;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const listTop = useRef<HTMLDivElement>(null);

  const matches = useMemo(
    () => searchProducts(products, query),
    [products, query],
  );
  const result = useMemo(
    () =>
      queryProducts(matches, {
        filters: applied,
        sort,
        region,
        page,
        pageSize: productsPage.pageSize,
      }),
    [matches, applied, sort, region, page],
  );

  const activeFilters = describeActiveFilters(applied, facets, region);

  function submitSearch(next: string) {
    router.push(searchHref(next), { scroll: false });
  }

  function resetFilters() {
    const defaults = getDefaultFilters(facets);
    setDraft(defaults);
    setApplied(defaults);
    setPageState({ query, page: 1 });
  }

  function goToPage(nextPage: number) {
    setPageState({ query, page: nextPage });
    listTop.current?.scrollIntoView({ block: "start" });
  }

  const count = matches.length;
  const summary = query
    ? count > 0
      ? `Showing ${count} ${count === 1 ? "result" : "results"} ${productsPage.studios}.`
      : "We couldn’t find anything for that search."
    : `Browse all ${products.length} creations from our Lahore and Berlin studios.`;

  return (
    <>
      <Container className="pt-16">
        <div className="lg:pr-5 lg:pl-[30px]">
          <Breadcrumb
            plain
            className="lg:-ml-[7px]"
            items={[
              { label: "Home", href: "/" },
              { label: query ? "Search Results" : "Products" },
            ]}
          />
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <h1 className="min-w-0 font-heading text-3xl leading-[1.2] font-medium break-words lg:text-[clamp(2.25rem,3.33vw,3rem)]">
              {query ? (
                <>Search Results for “{query}”</>
              ) : (
                productsPage.allTitle
              )}
            </h1>
            <div className="lg:w-[327px] lg:shrink-0">
              <ProductSearchBox
                key={query}
                initialQuery={query}
                onSubmit={submitSearch}
              />
            </div>
          </div>
          <p
            aria-live="polite"
            className="mt-[22px] max-w-[46rem] text-base text-foreground"
          >
            {summary}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-[25px] gap-y-3 lg:mt-16">
            <p className="text-[13.6px] tracking-normal text-muted-foreground uppercase">
              {productsPage.trendingLabel}
            </p>
            <ul className="flex flex-wrap gap-x-[31px] gap-y-3">
              {productsPage.trendingSearches.map((term) => (
                <li key={term}>
                  <Link
                    href={searchHref(term)}
                    scroll={false}
                    className="inline-flex h-[35px] items-center rounded-full bg-white px-6 text-sm font-medium transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {term}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>

      <div className="mt-8 bg-panel lg:mt-[66px]">
        <Container>
          <div className="flex min-h-[94px] flex-wrap items-center justify-between gap-4 py-4 lg:pr-[26px] lg:pl-[76px]">
            <p className="text-[13px]">
              {activeFilters.length === 0 ? (
                "No filters active"
              ) : (
                <>
                  {activeFilters.length}{" "}
                  {activeFilters.length === 1 ? "Filter" : "Filters"} Active:{" "}
                  <span className="text-[11px] text-muted-foreground">
                    {activeFilters.slice(0, MAX_LISTED_FILTERS).join(", ")}
                    {activeFilters.length > MAX_LISTED_FILTERS
                      ? ` +${activeFilters.length - MAX_LISTED_FILTERS}`
                      : ""}
                  </span>
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-4 lg:gap-[30px]">
              <Select
                size="lg"
                label="Sort By:"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as SortValue);
                  setPageState({ query, page: 1 });
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <span
                aria-hidden
                className="hidden h-8 w-px bg-black/15 sm:block"
              />
              <ViewToggle large value={view} onChange={setView} />
              <Button
                variant="secondary"
                size="sm"
                aria-expanded={filtersOpen}
                aria-controls="products-filters"
                onClick={() => setFiltersOpen((open) => !open)}
                className="h-11 lg:hidden"
              >
                <SlidersHorizontal aria-hidden className="size-3.5" />
                Filters
              </Button>
            </div>
          </div>
        </Container>
      </div>

      <Container className="pt-8 pb-16 lg:pt-16">
        <div className="grid gap-4 lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          <FilterSidebar
            id="products-filters"
            facets={facets}
            products={matches}
            value={draft}
            region={region}
            onChange={setDraft}
            onApply={() => {
              setApplied(draft);
              setPageState({ query, page: 1 });
              setFiltersOpen(false);
            }}
            onClear={() => setDraft(getDefaultFilters(facets))}
            onReset={resetFilters}
            className={cn(filtersOpen ? "flex" : "hidden", "lg:flex")}
          />

          <CatalogResults
            listRef={listTop}
            items={result.items}
            total={result.total}
            shown={result.shown}
            page={result.page}
            totalPages={result.totalPages}
            view={view}
            onPageChange={goToPage}
            empty={
              count === 0 ? (
                <EmptyState
                  title={`No results for “${query}”`}
                  description="Check the spelling or try one of the trending searches."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => submitSearch("")}
                    >
                      Clear search
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="No products match your filters"
                  description="Try removing a filter."
                  action={
                    <Button variant="secondary" onClick={resetFilters}>
                      Reset filters
                    </Button>
                  }
                />
              )
            }
          />
        </div>
      </Container>
    </>
  );
}
