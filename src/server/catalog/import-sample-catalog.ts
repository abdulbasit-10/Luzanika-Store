import type pg from "pg";

import type { CatalogProduct } from "@/features/catalog/types";
import type { ProductSummary } from "@/types/product";
import type { RegionCode } from "@/types/region";

import { getCatalog, listCategorySlugs } from "./sample/mock-catalog";
import {
  mockFeaturedProducts,
  mockNewArrivals,
  mockSpecialOffers,
} from "./sample/mock-products";
import { detailedProducts } from "./sample/mock-product-details";
import { getProductListing } from "./sample/product-listing";
import { getProduct } from "./sample/product-service";

/**
 * One-time import of the sample catalogue (the data the website was designed
 * with) into the database. After this the database is the only source of truth
 * and the admin panel edits it, so the import only ever ADDS what is missing:
 * it never changes a row that exists and never resets stock. It is safe to run
 * again.
 */

const MARKETS: RegionCode[] = ["PK", "DE"];
const designed = new Set(detailedProducts.map((product) => product.slug));
/** Placeholder stock until the client enters the real numbers. */
const INITIAL_STOCK = 25;

const HOME_SECTIONS: { section: string; products: ProductSummary[] }[] = [
  { section: "featured", products: mockFeaturedProducts },
  { section: "new-arrivals", products: mockNewArrivals },
  { section: "special-offers", products: mockSpecialOffers },
];

export interface ImportSummary {
  categories: number;
  products: number;
  variants: number;
  homeFeatures: number;
}

interface SourceProduct {
  slug: string;
  listed: boolean;
  categorySlug?: string;
  subcategorySlug?: string;
  collectionSlug?: string;
  availability?: string;
  badge?: ProductSummary["badge"];
  isNew?: boolean;
}

/** Every product once, in the order the all-products page lists them. */
function collectSourceProducts(): SourceProduct[] {
  const cards = new Map<string, { card: CatalogProduct; category: string }>();
  for (const categorySlug of listCategorySlugs()) {
    for (const card of getCatalog(categorySlug)?.products ?? []) {
      cards.set(card.slug, { card, category: categorySlug });
    }
  }
  const homeCards = new Map<string, ProductSummary>();
  for (const product of HOME_SECTIONS.flatMap((item) => item.products)) {
    homeCards.set(product.slug, product);
  }

  const result: SourceProduct[] = [];
  const seen = new Set<string>();

  for (const { slug } of getProductListing().products) {
    const entry = cards.get(slug);
    result.push({
      slug,
      listed: true,
      categorySlug: entry?.category,
      subcategorySlug: entry?.card.subcategory,
      collectionSlug: entry?.card.collection,
      availability: entry?.card.availability,
      badge: (entry?.card ?? homeCards.get(slug))?.badge,
      isNew: (entry?.card ?? homeCards.get(slug))?.isNew,
    });
    seen.add(slug);
  }

  // Designed pages that have no listing card stay reachable but unlisted. A
  // breadcrumb label that is not one of the category's subcategories is dropped.
  for (const product of detailedProducts) {
    if (seen.has(product.slug)) continue;
    const subcategorySlug = getCatalog(
      product.category?.slug ?? "",
    )?.category.subcategories.find(
      (item) => item.shortLabel === product.subcategoryLabel,
    )?.slug;
    result.push({
      slug: product.slug,
      listed: false,
      categorySlug: product.category?.slug,
      subcategorySlug,
    });
  }

  return result;
}

function skuPart(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function importSampleCatalog(
  pool: pg.Pool,
): Promise<ImportSummary> {
  const client = await pool.connect();
  const summary: ImportSummary = {
    categories: 0,
    products: 0,
    variants: 0,
    homeFeatures: 0,
  };

  try {
    await client.query("BEGIN");

    const categoryIds = new Map<string, string>();
    const subcategoryIds = new Map<string, string>();
    const collectionIds = new Map<string, string>();

    for (const [categoryIndex, categorySlug] of listCategorySlugs().entries()) {
      const catalog = getCatalog(categorySlug);
      if (!catalog) continue;
      const { category, facets } = catalog;

      const inserted = await client.query(
        `INSERT INTO categories (slug, label, hero_title, title, description,
           hero_image_src, hero_image_alt, hero_image_position, all_label,
           filter_sizes, price_min, price_max, price_step, sort)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (slug) DO NOTHING`,
        [
          category.slug,
          category.label,
          category.heroTitle,
          category.title,
          category.description,
          category.heroImage.src,
          category.heroImage.alt,
          category.heroImage.position ?? null,
          category.subcategories[0].label,
          facets.sizes,
          facets.priceRange.min,
          facets.priceRange.max,
          facets.priceRange.step,
          categoryIndex,
        ],
      );
      summary.categories += inserted.rowCount ?? 0;

      const categoryId = (
        await client.query<{ id: string }>(
          "SELECT id FROM categories WHERE slug = $1",
          [category.slug],
        )
      ).rows[0].id;
      categoryIds.set(category.slug, categoryId);

      // The first pill is "all"; the service adds it back from all_label.
      for (const [index, item] of category.subcategories.slice(1).entries()) {
        await client.query(
          `INSERT INTO subcategories (category_id, slug, label, short_label, sort)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (category_id, slug) DO NOTHING`,
          [categoryId, item.slug, item.label, item.shortLabel ?? null, index],
        );
        const row = await client.query<{ id: string }>(
          "SELECT id FROM subcategories WHERE category_id = $1 AND slug = $2",
          [categoryId, item.slug],
        );
        subcategoryIds.set(`${category.slug}/${item.slug}`, row.rows[0].id);
      }

      for (const [index, option] of facets.collections.entries()) {
        await client.query(
          `INSERT INTO collections (slug, label) VALUES ($1, $2)
           ON CONFLICT (slug) DO NOTHING`,
          [option.value, option.label],
        );
        const row = await client.query<{ id: string }>(
          "SELECT id FROM collections WHERE slug = $1",
          [option.value],
        );
        collectionIds.set(option.value, row.rows[0].id);
        await client.query(
          `INSERT INTO category_collections (category_id, collection_id, sort)
           VALUES ($1, $2, $3)
           ON CONFLICT (category_id, collection_id) DO NOTHING`,
          [categoryId, row.rows[0].id, index],
        );
      }
    }

    const productIds = new Map<string, string>();

    for (const [index, source] of collectSourceProducts().entries()) {
      const detail = getProduct(source.slug);
      if (!detail) throw new Error(`No product page for ${source.slug}`);

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO products (slug, name, tagline, category_id, subcategory_id,
           collection_id, availability, badge_label, badge_tone, is_new,
           rating_avg, rating_count, notes, has_size_guide, listed, sort)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (slug) DO NOTHING
         RETURNING id`,
        [
          detail.slug,
          detail.name,
          detail.tagline ?? null,
          source.categorySlug
            ? (categoryIds.get(source.categorySlug) ?? null)
            : null,
          source.categorySlug && source.subcategorySlug
            ? (subcategoryIds.get(
                `${source.categorySlug}/${source.subcategorySlug}`,
              ) ?? null)
            : null,
          source.collectionSlug
            ? (collectionIds.get(source.collectionSlug) ?? null)
            : null,
          source.availability ?? null,
          source.badge?.label ?? null,
          source.badge?.tone ?? null,
          // The designed page decides for its product; otherwise the card does.
          designed.has(source.slug)
            ? Boolean(detail.isNew)
            : Boolean(source.isNew),
          // The sample ratings are invented: a rating only ever comes from real reviews.
          null,
          0,
          detail.notes ?? [],
          detail.hasSizeGuide ?? false,
          source.listed,
          index,
        ],
      );

      if (inserted.rows.length === 0) {
        const existing = await client.query<{ id: string }>(
          "SELECT id FROM products WHERE slug = $1",
          [source.slug],
        );
        productIds.set(source.slug, existing.rows[0].id);
        continue;
      }

      const productId = inserted.rows[0].id;
      productIds.set(source.slug, productId);
      summary.products += 1;

      for (const price of detail.prices) {
        await client.query(
          `INSERT INTO product_prices (product_id, market, currency, amount, compare_at_amount)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            productId,
            price.region,
            price.currency,
            price.amount,
            price.compareAtAmount ?? null,
          ],
        );
      }

      for (const [position, image] of detail.images.entries()) {
        await client.query(
          `INSERT INTO product_images (product_id, src, alt, position, sort)
           VALUES ($1, $2, $3, $4, $5)`,
          [productId, image.src, image.alt, image.position ?? null, position],
        );
      }

      for (const [position, section] of (detail.details ?? []).entries()) {
        await client.query(
          `INSERT INTO product_detail_sections (product_id, title, body, sort)
           VALUES ($1, $2, $3, $4)`,
          [productId, section.title, section.body, position],
        );
      }

      // One variant per colour and size; a product with neither has one plain variant.
      const colors = detail.colors?.length ? detail.colors : [undefined];
      const sizes = detail.sizes?.length ? detail.sizes : [undefined];
      let variantSort = 0;
      for (const color of colors) {
        for (const size of sizes) {
          const sku = [detail.slug, color?.name, size]
            .filter((part): part is string => Boolean(part))
            .map(skuPart)
            .join("-");
          const variant = await client.query<{ id: string }>(
            `INSERT INTO product_variants (product_id, sku, color_name, color_hex, size_label, sort)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
              productId,
              sku,
              color?.name ?? null,
              color?.hex ?? null,
              size ?? null,
              variantSort++,
            ],
          );
          summary.variants += 1;

          for (const market of MARKETS) {
            await client.query(
              `INSERT INTO inventory (variant_id, market, on_hand) VALUES ($1, $2, $3)`,
              [variant.rows[0].id, market, INITIAL_STOCK],
            );
            await client.query(
              `INSERT INTO stock_movements (variant_id, market, delta, reason, note)
               VALUES ($1, $2, $3, 'initial_import', 'Placeholder stock from the sample catalogue')`,
              [variant.rows[0].id, market, INITIAL_STOCK],
            );
          }
        }
      }
    }

    for (const { section, products } of HOME_SECTIONS) {
      const next = await client.query<{ next: number }>(
        "SELECT COALESCE(MAX(sort) + 1, 0)::int AS next FROM home_features WHERE section = $1",
        [section],
      );
      let sort = next.rows[0].next;
      for (const product of products) {
        const productId = productIds.get(product.slug);
        if (!productId) throw new Error(`Unknown home product ${product.slug}`);
        const added = await client.query(
          `INSERT INTO home_features (section, product_id, sort) VALUES ($1, $2, $3)
           ON CONFLICT (section, product_id) DO NOTHING`,
          [section, productId, sort],
        );
        if (added.rowCount) {
          sort += 1;
          summary.homeFeatures += 1;
        }
      }
    }

    await client.query("COMMIT");
    return summary;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
