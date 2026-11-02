import type { ProductSummary } from "@/types/product";

export type CategorySlug = "men" | "ladies" | "kids" | "bags" | "fragrances";

/** Sentinel subcategory meaning "no subcategory filter". */
export const ALL_SUBCATEGORY = "all";

export interface Subcategory {
  slug: string;
  /** Pill text, e.g. "FORMAL TAILORING". */
  label: string;
  /** Short name used in the breadcrumb, e.g. "Formal". Omit for the "all" entry. */
  shortLabel?: string;
}

export interface CategoryDefinition {
  slug: CategorySlug;
  /** Short name used in breadcrumbs, e.g. "Men". */
  label: string;
  /** Hero title, e.g. "Men Collection". */
  heroTitle: string;
  /** Page heading, e.g. "Men — Collection". */
  title: string;
  description: string;
  heroImage: { src: string; alt: string; position?: string };
  /** The first entry must be the ALL_SUBCATEGORY pill. */
  subcategories: Subcategory[];
}

export interface CatalogProduct extends ProductSummary {
  subcategory: string;
  /** Sidebar "Category" filter value. */
  collection: string;
  /** Sidebar "Availability" filter value. */
  availability: string;
}

/**
 * What the sidebar filters need. The all-products page also lists products
 * that belong to no collection (the home page ones); they simply never match
 * a collection or availability filter.
 */
export interface FilterableProduct extends ProductSummary {
  collection?: string;
  availability?: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

/** The filter choices a category offers. The backend will return this per category. */
export interface CatalogFacets {
  collections: FilterOption[];
  sizes: string[];
  availability: FilterOption[];
  priceRange: { min: number; max: number; step: number };
}

/** Everything the listing page needs for one category. */
export interface Catalog {
  category: CategoryDefinition;
  facets: CatalogFacets;
  products: CatalogProduct[];
}

export interface CatalogFilters {
  collections: string[];
  sizes: string[];
  availability: string[];
  maxPrice: number;
}

export type SortValue = "relevance" | "price-asc" | "price-desc";

export type ViewMode = "grid" | "list";
