import "server-only";

import type { Catalog, CategoryDefinition } from "@/features/catalog/types";
import type { ProductDetail } from "@/features/product-detail/types";
import type { ProductListing } from "@/features/products/types";
import type { ProductSummary } from "@/types/product";
import { getOffer, type OfferDto } from "@/server/services/offer-service";

import {
  toCatalogProduct,
  toCategoryDefinition,
  toFacets,
  toListedProduct,
  toListingFacets,
  toProductDetail,
  toSummary,
} from "@/server/catalog/map-catalog";
import { catalogRepository } from "@/server/repositories/catalog-repository";

export interface HomeProducts {
  featured: ProductSummary[];
  newArrivals: ProductSummary[];
  specialOffers: ProductSummary[];
  /** When the special offers row ends, and its headline (both optional). */
  offer: OfferDto;
}

/** Everything the shop shows comes from here: categories, product lists, product pages and home sections. */
export const catalogService = {
  async listCategories(): Promise<CategoryDefinition[]> {
    const [categories, subcategories] = await Promise.all([
      catalogRepository.listCategories(),
      catalogRepository.listSubcategories(),
    ]);
    return categories.map((row) => toCategoryDefinition(row, subcategories));
  },

  /** One category page: its definition, filter choices and products. */
  async getCatalog(slug: string): Promise<Catalog | undefined> {
    const [categories, subcategories, collections] = await Promise.all([
      catalogRepository.listCategories(),
      catalogRepository.listSubcategories(),
      catalogRepository.listCategoryCollections(),
    ]);
    const category = categories.find((row) => row.slug === slug);
    if (!category) return undefined;

    const rows = await catalogRepository.listCategoryProducts(slug);
    const parts = await catalogRepository.listProductParts(
      rows.map((row) => row.id),
      { firstImageOnly: true },
    );

    return {
      category: toCategoryDefinition(category, subcategories),
      facets: toFacets(category, collections),
      products: rows.map((row) => toCatalogProduct(row, parts)),
    };
  },

  /** The all-products page. */
  async getProductListing(): Promise<ProductListing> {
    const [categories, rows] = await Promise.all([
      catalogRepository.listCategories(),
      catalogRepository.listListedProducts(),
    ]);
    const parts = await catalogRepository.listProductParts(
      rows.map((row) => row.id),
      { firstImageOnly: true },
    );

    return {
      facets: toListingFacets(categories),
      products: rows.map((row) => toListedProduct(row, parts)),
    };
  },

  async getProduct(slug: string): Promise<ProductDetail | undefined> {
    const row = await catalogRepository.findProductBySlug(slug);
    if (!row) return undefined;

    const [parts, sections] = await Promise.all([
      catalogRepository.listProductParts([row.id], { firstImageOnly: false }),
      catalogRepository.listDetailSections(row.id),
    ]);
    const stock = await catalogRepository.listAvailableStock(
      parts.variants.map((variant) => variant.id),
    );

    return toProductDetail(row, parts, sections, stock);
  },

  async listProductSlugs(): Promise<string[]> {
    const rows = await catalogRepository.listProductSlugs();
    return rows.map((row) => row.slug);
  },

  async getHomeProducts(): Promise<HomeProducts> {
    const rows = await catalogRepository.listHomeProducts();
    const parts = await catalogRepository.listProductParts(
      [...new Set(rows.map((row) => row.id))],
      { firstImageOnly: true },
    );
    const section = (name: string) =>
      rows
        .filter((row) => row.home_section === name)
        .map((row) => toSummary(row, parts));

    // An offer whose end time has passed is over: its row is empty, so the shop does not show it.
    const offer = await getOffer();
    const ended = offer.endsAt !== null && new Date(offer.endsAt) <= new Date();

    return {
      featured: section("featured"),
      newArrivals: section("new-arrivals"),
      specialOffers: ended ? [] : section("special-offers"),
      offer,
    };
  },
};
