import {
  ALL_SUBCATEGORY,
  type CatalogFacets,
  type CatalogFilters,
  type CatalogProduct,
  type FilterableProduct,
  type SortValue,
} from "@/features/catalog/types";
import type { RegionCode } from "@/types/region";

export function getDefaultFilters(facets: CatalogFacets): CatalogFilters {
  return {
    collections: [],
    sizes: [],
    availability: [],
    maxPrice: facets.priceRange.max,
  };
}

function priceInRegion(product: FilterableProduct, region: RegionCode) {
  return product.prices.find((price) => price.region === region)?.amount;
}

export function filterBySubcategory(
  products: CatalogProduct[],
  subcategory: string,
) {
  return subcategory === ALL_SUBCATEGORY
    ? products
    : products.filter((product) => product.subcategory === subcategory);
}

export function matchesFilters(
  product: FilterableProduct,
  filters: CatalogFilters,
  region: RegionCode,
) {
  if (
    filters.collections.length > 0 &&
    !(product.collection && filters.collections.includes(product.collection))
  ) {
    return false;
  }
  if (
    filters.availability.length > 0 &&
    !(
      product.availability &&
      filters.availability.includes(product.availability)
    )
  ) {
    return false;
  }
  if (
    filters.sizes.length > 0 &&
    !product.sizes?.some((size) => filters.sizes.includes(size))
  ) {
    return false;
  }
  const price = priceInRegion(product, region);
  return price === undefined || price <= filters.maxPrice;
}

/** "relevance" keeps the incoming order, so callers rank before sorting. */
export function sortProducts<T extends FilterableProduct>(
  products: T[],
  sort: SortValue,
  region: RegionCode,
) {
  if (sort === "relevance") return products;

  const direction = sort === "price-asc" ? 1 : -1;
  return [...products].sort((a, b) => {
    const priceA = priceInRegion(a, region);
    const priceB = priceInRegion(b, region);
    // Products without a price in this region always go last.
    if (priceA === undefined && priceB === undefined) return 0;
    if (priceA === undefined) return 1;
    if (priceB === undefined) return -1;
    return (priceA - priceB) * direction;
  });
}

export interface PageResult<T> {
  items: T[];
  /** Items across all pages. */
  total: number;
  page: number;
  totalPages: number;
  /** Number of items shown up to and including this page. */
  shown: number;
}

/** Slices one page out of an already filtered and sorted list. */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): PageResult<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page: currentPage,
    totalPages,
    shown: Math.min(currentPage * pageSize, items.length),
  };
}

export interface CatalogQuery {
  subcategory: string;
  filters: CatalogFilters;
  sort: SortValue;
  region: RegionCode;
  page: number;
  pageSize: number;
}

export interface CatalogResult extends PageResult<CatalogProduct> {
  /** Products in the chosen subcategory, before the sidebar filters. */
  subcategoryTotal: number;
}

/** Pure filter, sort and paginate step. The backend will do the same from query params. */
export function queryCatalog(
  products: CatalogProduct[],
  { subcategory, filters, sort, region, page, pageSize }: CatalogQuery,
): CatalogResult {
  const inSubcategory = filterBySubcategory(products, subcategory);
  const matching = sortProducts(
    inSubcategory.filter((product) => matchesFilters(product, filters, region)),
    sort,
    region,
  );

  return {
    ...paginate(matching, page, pageSize),
    subcategoryTotal: inSubcategory.length,
  };
}
