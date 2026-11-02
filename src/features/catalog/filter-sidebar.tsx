"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RangeSlider } from "@/components/ui/range-slider";
import { StylistCard } from "@/features/catalog/stylist-card";
import type {
  CatalogFacets,
  CatalogFilters,
  FilterableProduct,
} from "@/features/catalog/types";
import { cn } from "@/utils/cn";
import { formatRegionalPrice } from "@/utils/format-currency";
import type { RegionCode } from "@/types/region";

interface FilterSidebarProps {
  id?: string;
  facets: CatalogFacets;
  /** Used for the availability counts. */
  products: FilterableProduct[];
  value: CatalogFilters;
  region: RegionCode;
  onChange: (next: CatalogFilters) => void;
  onApply: () => void;
  onClear: () => void;
  onReset: () => void;
  className?: string;
}

function toggle(list: string[], item: string) {
  return list.includes(item)
    ? list.filter((entry) => entry !== item)
    : [...list, item];
}

function Group({
  legend,
  children,
  uppercase,
}: {
  legend: string;
  children: ReactNode;
  uppercase?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend
        className={cn(
          "mb-4 font-heading text-xl leading-7 font-medium",
          uppercase && "text-lg tracking-wide uppercase",
        )}
      >
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

export function FilterSidebar({
  id,
  facets,
  products,
  value,
  region,
  onChange,
  onApply,
  onClear,
  onReset,
  className,
}: FilterSidebarProps) {
  const { min, max, step } = facets.priceRange;
  const formatLabel = (amount: number) =>
    formatRegionalPrice(amount, region, undefined, { fractionDigits: 0 });

  return (
    <div id={id} className={cn("flex flex-col gap-6", className)}>
      <form
        aria-label="Filter products"
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
        className="flex flex-col gap-9 rounded-xl bg-panel p-5"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-heading text-2xl font-medium">Filter</h2>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>

        <Group legend="Category">
          {facets.collections.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={value.collections.includes(option.value)}
              onChange={() =>
                onChange({
                  ...value,
                  collections: toggle(value.collections, option.value),
                })
              }
            />
          ))}
        </Group>

        <Group legend="Size">
          {facets.sizes.map((size) => (
            <Checkbox
              key={size}
              label={size}
              checked={value.sizes.includes(size)}
              onChange={() =>
                onChange({ ...value, sizes: toggle(value.sizes, size) })
              }
            />
          ))}
        </Group>

        <Group legend="Availability" uppercase>
          {facets.availability.map((option) => {
            const count = products.filter(
              (product) => product.availability === option.value,
            ).length;
            return (
              <Checkbox
                key={option.value}
                label={`${option.label} (${count})`}
                checked={value.availability.includes(option.value)}
                onChange={() =>
                  onChange({
                    ...value,
                    availability: toggle(value.availability, option.value),
                  })
                }
              />
            );
          })}
        </Group>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 font-heading text-xl leading-7 font-medium">
            Price
          </legend>
          <RangeSlider
            aria-label="Maximum price"
            min={min}
            max={max}
            step={step}
            value={value.maxPrice}
            onValueChange={(maxPrice) => onChange({ ...value, maxPrice })}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatLabel(min)}</span>
            <span>{formatLabel(value.maxPrice)}</span>
          </div>
        </fieldset>

        <div className="flex flex-col gap-3">
          <Button type="submit" size="sm" className="w-full rounded-sm py-3.5">
            Apply Filters
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onReset}
            className="w-full rounded-sm border-primary bg-transparent py-3 text-[11px] tracking-wide uppercase"
          >
            Reset to default
          </Button>
        </div>
      </form>

      <StylistCard />
    </div>
  );
}
