"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { FilterPill, FilterPillLink } from "@/components/ui/filter-pill";
import { Select } from "@/components/ui/select";
import { ViewToggle } from "@/components/ui/view-toggle";
import {
  CATALOG_PAGE_SIZE,
  CATEGORY_TABS,
  SORT_OPTIONS,
} from "@/features/catalog/catalog-config";
import { CatalogResults } from "@/features/catalog/catalog-results";
import { FilterSidebar } from "@/features/catalog/filter-sidebar";
import {
  getDefaultFilters,
  queryCatalog,
} from "@/features/catalog/query-catalog";
import {
  ALL_SUBCATEGORY,
  type Catalog,
  type SortValue,
  type ViewMode,
} from "@/features/catalog/types";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/utils/cn";

/**
 * Interactive part of the listing page. Filters, sort and page live in local
 * state for now; once the backend exists they become query params for the API
 * request (and TanStack Query keys).
 */
export function CatalogBrowser({ category, facets, products }: Catalog) {
  const region = useUiStore((state) => state.region);

  const [subcategory, setSubcategory] = useState(ALL_SUBCATEGORY);
  const [applied, setApplied] = useState(() => getDefaultFilters(facets));
  // The sidebar edits a draft; it only affects the list after "Apply Filters".
  const [draft, setDraft] = useState(applied);
  const [sort, setSort] = useState<SortValue>("relevance");
  const [view, setView] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const listTop = useRef<HTMLDivElement>(null);

  const result = useMemo(
    () =>
      queryCatalog(products, {
        subcategory,
        filters: applied,
        sort,
        region,
        page,
        pageSize: CATALOG_PAGE_SIZE,
      }),
    [products, subcategory, applied, sort, region, page],
  );

  const activeSubcategory = category.subcategories.find(
    (item) => item.slug === subcategory,
  );

  function resetFilters() {
    const defaults = getDefaultFilters(facets);
    setDraft(defaults);
    setApplied(defaults);
    setPage(1);
  }

  function goToPage(nextPage: number) {
    setPage(nextPage);
    listTop.current?.scrollIntoView({ block: "start" });
  }

  return (
    <Container className="pt-14 pb-20 lg:pt-[6.5rem]">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: category.label, href: `/${category.slug}` },
          ...(activeSubcategory?.shortLabel
            ? [{ label: activeSubcategory.shortLabel }]
            : []),
        ]}
      />
      <h2 className="mt-6 max-w-xl font-heading text-3xl leading-tight font-medium lg:text-[40px]">
        {category.title}
      </h2>
      <p className="mt-6 max-w-xl text-base text-muted-foreground">
        {category.description}
      </p>

      <div className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-heading text-3xl leading-tight font-medium lg:text-[40px]">
            Our Product
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <Select
              label="Sort By:"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortValue);
                setPage(1);
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
            <ViewToggle value={view} onChange={setView} />
            <Button
              variant="secondary"
              size="sm"
              aria-expanded={filtersOpen}
              aria-controls="catalog-filters"
              onClick={() => setFiltersOpen((open) => !open)}
              className="h-10 lg:hidden"
            >
              <SlidersHorizontal aria-hidden className="size-3.5" />
              Filters
            </Button>
          </div>
        </div>

        <nav
          aria-label="Departments"
          className="mt-5 flex flex-wrap gap-1 lg:mt-7"
        >
          {CATEGORY_TABS.map((tab) => (
            <FilterPillLink
              key={tab.slug}
              href={`/${tab.slug}`}
              size="sm"
              active={tab.slug === category.slug}
            >
              {tab.label}
            </FilterPillLink>
          ))}
        </nav>

        <div
          role="group"
          aria-label="Subcategories"
          className="mt-5 flex flex-wrap gap-3 lg:mt-6 xl:justify-between"
        >
          {category.subcategories.map((item) => {
            const active = item.slug === subcategory;
            return (
              <FilterPill
                key={item.slug}
                active={active}
                onClick={() => {
                  setSubcategory(item.slug);
                  setPage(1);
                }}
              >
                {active
                  ? `${item.label} (${result.subcategoryTotal})`
                  : item.label}
              </FilterPill>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 lg:mt-12 lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          <FilterSidebar
            id="catalog-filters"
            facets={facets}
            products={products}
            value={draft}
            region={region}
            onChange={setDraft}
            onApply={() => {
              setApplied(draft);
              setPage(1);
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
              <EmptyState
                title="No products match your filters"
                description="Try removing a filter or choosing another subcategory."
                action={
                  <Button variant="secondary" onClick={resetFilters}>
                    Reset filters
                  </Button>
                }
              />
            }
          />
        </div>
      </div>
    </Container>
  );
}
