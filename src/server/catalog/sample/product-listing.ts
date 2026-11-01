import {
  getCatalog,
  listCategorySlugs,
} from "@/server/catalog/sample/mock-catalog";
import type { CatalogFacets, FilterOption } from "@/features/catalog/types";
import {
  mockFeaturedProducts,
  mockNewArrivals,
  mockSpecialOffers,
} from "@/server/catalog/sample/mock-products";
import type { ListedProduct, ProductListing } from "@/features/products/types";

/**
 * Mock of GET /products: every product of every category plus the home page
 * products. The sidebar "Category" filter offers the main categories (Men,
 * Ladies, ...), not each category's own collections; the other filter choices
 * are merged across categories. Swap the body for `apiGet(...)` and keep the
 * signature.
 */
export function getProductListing(): ProductListing {
  const products = new Map<string, ListedProduct>();
  const categories: FilterOption[] = [];
  const sizes = new Set<string>();
  const availability = new Map<string, FilterOption>();
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  let step = Number.POSITIVE_INFINITY;

  for (const slug of listCategorySlugs()) {
    const catalog = getCatalog(slug);
    if (!catalog) continue;
    const { category, facets } = catalog;

    categories.push({ value: category.slug, label: category.label });
    for (const size of facets.sizes) sizes.add(size);
    for (const option of facets.availability) {
      if (!availability.has(option.value)) {
        availability.set(option.value, option);
      }
    }
    min = Math.min(min, facets.priceRange.min);
    max = Math.max(max, facets.priceRange.max);
    step = Math.min(step, facets.priceRange.step);

    for (const product of catalog.products) {
      const subcategory = category.subcategories.find(
        (item) => item.slug === product.subcategory,
      );
      products.set(product.slug, {
        ...product,
        // On this page the sidebar "Category" filter is the main category.
        collection: category.slug,
        categoryLabel: category.label,
        subcategoryLabel: subcategory?.shortLabel ?? subcategory?.label,
        // The category's own collection name, which the search still matches.
        collectionLabel: facets.collections.find(
          (option) => option.value === product.collection,
        )?.label,
      });
    }
  }

  // Home page products belong to no category or availability; a category's own
  // copy of the same product wins.
  for (const product of [
    ...mockFeaturedProducts,
    ...mockNewArrivals,
    ...mockSpecialOffers,
  ]) {
    if (!products.has(product.slug)) products.set(product.slug, product);
  }

  const facets: CatalogFacets = {
    collections: categories,
    sizes: [...sizes],
    availability: [...availability.values()],
    priceRange: { min, max, step },
  };

  return { facets, products: [...products.values()] };
}
