import {
  getCatalog,
  listCategorySlugs,
} from "@/server/catalog/sample/mock-catalog";
import type { CategoryDefinition } from "@/features/catalog/types";
import { detailedProducts } from "@/server/catalog/sample/mock-product-details";
import type { SampleProductDetail } from "@/server/catalog/sample/types";
import {
  mockFeaturedProducts,
  mockNewArrivals,
  mockSpecialOffers,
} from "@/server/catalog/sample/mock-products";
import type { ProductSummary } from "@/types/product";

/**
 * Mock product service. Each function mirrors an API call the Express backend
 * will provide (`GET /products/:slug`, `GET /products`); swap the bodies for
 * `apiGet(...)` and keep the signatures.
 */

const CLOTHING_CATEGORIES = ["men", "ladies", "kids"];
const MOCK_STOCK = 25;

/** Builds a page from listing data, for products without their own Figma design. */
function fromSummary(
  product: ProductSummary & { subcategory?: string },
  category?: CategoryDefinition,
): SampleProductDetail {
  const subcategory = category?.subcategories.find(
    (item) => item.slug === product.subcategory,
  );

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.notes?.join(" · "),
    notes: product.notes,
    images: product.image ? [product.image] : [],
    prices: product.prices,
    rating: product.rating,
    isNew: product.isNew ?? product.badge?.label === "NEW ARRIVAL",
    colors: product.colors,
    sizes: product.sizes,
    hasSizeGuide: category
      ? CLOTHING_CATEGORIES.includes(category.slug)
      : false,
    stock: MOCK_STOCK,
    category: category && { slug: category.slug, label: category.label },
    subcategoryLabel: subcategory?.shortLabel,
  };
}

let index: Map<string, SampleProductDetail> | undefined;

function getIndex() {
  if (index) return index;

  const products = new Map<string, SampleProductDetail>();

  for (const summary of [
    ...mockFeaturedProducts,
    ...mockNewArrivals,
    ...mockSpecialOffers,
  ]) {
    products.set(summary.slug, fromSummary(summary));
  }

  for (const slug of listCategorySlugs()) {
    const catalog = getCatalog(slug);
    if (!catalog) continue;
    for (const product of catalog.products) {
      products.set(product.slug, fromSummary(product, catalog.category));
    }
  }

  // Designed products replace any generated page with the same slug.
  for (const product of detailedProducts) products.set(product.slug, product);

  index = products;
  return products;
}

export function getProduct(slug: string): SampleProductDetail | undefined {
  return getIndex().get(slug);
}

export function listProductSlugs(): string[] {
  return [...getIndex().keys()];
}
