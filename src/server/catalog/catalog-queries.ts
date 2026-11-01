import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { catalogService } from "@/server/services/catalog-service";

/**
 * What the pages read. Results are cached for a minute and refreshed in the
 * background, so the database is not hit on every page view. Anything that
 * edits the catalogue calls `revalidateTag("catalog")` to refresh it at once.
 * Stock shown here can be up to a minute old; carts and checkout check the
 * real stock.
 */

function cacheCatalog() {
  cacheLife({ stale: 300, revalidate: 60, expire: 3600 });
  cacheTag("catalog");
}

export async function getCachedCatalog(slug: string) {
  "use cache";
  cacheCatalog();
  return (await catalogService.getCatalog(slug)) ?? null;
}

export async function getCachedCategories() {
  "use cache";
  cacheCatalog();
  return catalogService.listCategories();
}

export async function getCachedProductListing() {
  "use cache";
  cacheCatalog();
  return catalogService.getProductListing();
}

export async function getCachedProduct(slug: string) {
  "use cache";
  cacheCatalog();
  return (await catalogService.getProduct(slug)) ?? null;
}

export async function getCachedProductSlugs() {
  "use cache";
  cacheCatalog();
  return catalogService.listProductSlugs();
}

export async function getCachedHomeProducts() {
  "use cache";
  cacheCatalog();
  return catalogService.getHomeProducts();
}
