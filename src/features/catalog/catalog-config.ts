import type { CategorySlug, SortValue } from "@/features/catalog/types";

export const CATALOG_PAGE_SIZE = 6;

export const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "relevance", label: "Relevant Products" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

/** Gender/department tabs above the product list. Labels follow the Figma design. */
export const CATEGORY_TABS: { slug: CategorySlug; label: string }[] = [
  { slug: "men", label: "Man" },
  { slug: "ladies", label: "LADIES" },
  { slug: "kids", label: "KIDS" },
  { slug: "bags", label: "BAGS & LEATHERGOODS" },
  { slug: "fragrances", label: "HAUTE PARFUMERIE" },
];
