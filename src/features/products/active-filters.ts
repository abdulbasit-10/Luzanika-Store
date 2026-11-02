import type { CatalogFacets, CatalogFilters } from "@/features/catalog/types";
import type { RegionCode } from "@/types/region";
import { formatRegionalPrice } from "@/utils/format-currency";

/** Readable names of the applied sidebar filters, for the "N Filters Active" line. */
export function describeActiveFilters(
  filters: CatalogFilters,
  facets: CatalogFacets,
  region: RegionCode,
): string[] {
  const labelOf = (
    options: { value: string; label: string }[],
    value: string,
  ) => options.find((option) => option.value === value)?.label ?? value;

  const labels = [
    ...filters.collections.map((value) => labelOf(facets.collections, value)),
    ...filters.sizes.map((size) => `Size ${size}`),
    ...filters.availability.map((value) => labelOf(facets.availability, value)),
  ];

  if (filters.maxPrice < facets.priceRange.max) {
    labels.push(
      `Up to ${formatRegionalPrice(filters.maxPrice, region, undefined, { fractionDigits: 0 })}`,
    );
  }

  return labels;
}
