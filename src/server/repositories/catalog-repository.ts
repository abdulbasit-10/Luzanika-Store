import "server-only";

import { QueryTypes } from "sequelize";

import { getSequelize } from "@/server/db/connection";

/**
 * Read-only catalogue queries. The catalogue is many joined tables, so these
 * are plain SQL (with bound values) rather than models. Only products that are
 * active and not deleted are ever returned.
 */

export interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  hero_title: string;
  title: string;
  description: string;
  hero_image_src: string;
  hero_image_alt: string;
  hero_image_position: string | null;
  all_label: string;
  filter_sizes: string[];
  price_min: string;
  price_max: string;
  price_step: string;
}

export interface SubcategoryRow {
  category_id: string;
  slug: string;
  label: string;
  short_label: string | null;
}

export interface CategoryCollectionRow {
  category_id: string;
  slug: string;
  label: string;
}

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  availability: string | null;
  badge_label: string | null;
  badge_tone: "dark" | "light" | null;
  is_new: boolean;
  rating_avg: string | null;
  rating_count: number;
  notes: string[];
  has_size_guide: boolean;
  category_slug: string | null;
  category_label: string | null;
  subcategory_slug: string | null;
  subcategory_label: string | null;
  subcategory_short_label: string | null;
  collection_slug: string | null;
  collection_label: string | null;
  /** Only set when the product was loaded as part of a home page section. */
  home_section?: string;
}

export interface PriceRow {
  product_id: string;
  market: "PK" | "DE";
  currency: "PKR" | "EUR";
  amount: string;
  compare_at_amount: string | null;
}

export interface ImageRow {
  product_id: string;
  src: string;
  alt: string;
  position: string | null;
}

export interface VariantRow {
  id: string;
  product_id: string;
  color_name: string | null;
  color_hex: string | null;
  size_label: string | null;
}

export interface SectionRow {
  product_id: string;
  title: string;
  body: string;
}

export interface InventoryRow {
  variant_id: string;
  market: "PK" | "DE";
  available: number;
}

export interface ProductParts {
  prices: PriceRow[];
  images: ImageRow[];
  variants: VariantRow[];
}

const PRODUCT_COLUMNS = `
  p.id, p.slug, p.name, p.tagline, p.availability, p.badge_label, p.badge_tone,
  p.is_new, p.rating_avg, p.rating_count, p.notes, p.has_size_guide,
  c.slug AS category_slug, c.label AS category_label,
  s.slug AS subcategory_slug, s.label AS subcategory_label, s.short_label AS subcategory_short_label,
  col.slug AS collection_slug, col.label AS collection_label`;

const PRODUCT_JOINS = `
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN subcategories s ON s.id = p.subcategory_id
  LEFT JOIN collections col ON col.id = p.collection_id`;

const VISIBLE = "p.status = 'active' AND p.deleted_at IS NULL";

function select<T extends object>(
  sql: string,
  replacements?: Record<string, unknown>,
): Promise<T[]> {
  return getSequelize().query<T>(sql, {
    type: QueryTypes.SELECT,
    replacements,
  });
}

export const catalogRepository = {
  listCategories(): Promise<CategoryRow[]> {
    return select<CategoryRow>("SELECT * FROM categories ORDER BY sort, id");
  },

  listSubcategories(): Promise<SubcategoryRow[]> {
    return select<SubcategoryRow>(
      `SELECT category_id, slug, label, short_label
       FROM subcategories ORDER BY category_id, sort, id`,
    );
  },

  listCategoryCollections(): Promise<CategoryCollectionRow[]> {
    return select<CategoryCollectionRow>(
      `SELECT cc.category_id, col.slug, col.label
       FROM category_collections cc
       JOIN collections col ON col.id = cc.collection_id
       ORDER BY cc.category_id, cc.sort, col.slug`,
    );
  },

  /** Every product shown in lists, in the all-products order. */
  listListedProducts(): Promise<ProductRow[]> {
    return select<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM products p ${PRODUCT_JOINS}
       WHERE ${VISIBLE} AND p.listed ORDER BY p.sort, p.id`,
    );
  },

  listCategoryProducts(categorySlug: string): Promise<ProductRow[]> {
    return select<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM products p ${PRODUCT_JOINS}
       WHERE ${VISIBLE} AND p.listed AND c.slug = :categorySlug
       ORDER BY p.sort, p.id`,
      { categorySlug },
    );
  },

  /** Unlisted products are included: they have a page, they just are not in the lists. */
  async findProductBySlug(slug: string): Promise<ProductRow | undefined> {
    const rows = await select<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM products p ${PRODUCT_JOINS}
       WHERE ${VISIBLE} AND p.slug = :slug`,
      { slug },
    );
    return rows[0];
  },

  /** Visible products (listed or not) by id, for lists that keep their own order such as the wishlist. */
  listProductsByIds(productIds: string[]): Promise<ProductRow[]> {
    if (productIds.length === 0) return Promise.resolve([]);
    return select<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM products p ${PRODUCT_JOINS}
       WHERE ${VISIBLE} AND p.id IN (:productIds)`,
      { productIds },
    );
  },
  listProductSlugs(): Promise<{ slug: string }[]> {
    return select<{ slug: string }>(
      `SELECT p.slug FROM products p WHERE ${VISIBLE} ORDER BY p.sort, p.id`,
    );
  },

  listHomeProducts(): Promise<ProductRow[]> {
    return select<ProductRow>(
      `SELECT ${PRODUCT_COLUMNS}, h.section AS home_section
       FROM home_features h
       JOIN products p ON p.id = h.product_id ${PRODUCT_JOINS}
       WHERE ${VISIBLE} ORDER BY h.section, h.sort`,
    );
  },

  /** Prices, photos and variants of the given products. `firstImageOnly` is enough for cards. */
  async listProductParts(
    productIds: string[],
    { firstImageOnly }: { firstImageOnly: boolean },
  ): Promise<ProductParts> {
    if (productIds.length === 0)
      return { prices: [], images: [], variants: [] };
    const replacements = { productIds };

    const [prices, images, variants] = await Promise.all([
      select<PriceRow>(
        `SELECT product_id, market, currency, amount, compare_at_amount
         FROM product_prices WHERE product_id IN (:productIds)
         ORDER BY product_id, CASE market WHEN 'PK' THEN 0 ELSE 1 END`,
        replacements,
      ),
      select<ImageRow>(
        firstImageOnly
          ? `SELECT DISTINCT ON (product_id) product_id, src, alt, position
             FROM product_images WHERE product_id IN (:productIds)
             ORDER BY product_id, sort`
          : `SELECT product_id, src, alt, position
             FROM product_images WHERE product_id IN (:productIds)
             ORDER BY product_id, sort`,
        replacements,
      ),
      select<VariantRow>(
        `SELECT id, product_id, color_name, color_hex, size_label
         FROM product_variants WHERE product_id IN (:productIds) AND active
         ORDER BY product_id, sort, id`,
        replacements,
      ),
    ]);

    return { prices, images, variants };
  },

  listDetailSections(productId: string): Promise<SectionRow[]> {
    return select<SectionRow>(
      `SELECT product_id, title, body FROM product_detail_sections
       WHERE product_id = :productId ORDER BY sort`,
      { productId },
    );
  },

  /** Units that can be sold right now: on hand minus what is reserved. */
  listAvailableStock(variantIds: string[]): Promise<InventoryRow[]> {
    if (variantIds.length === 0) return Promise.resolve([]);
    return select<InventoryRow>(
      `SELECT variant_id, market, (on_hand - reserved) AS available
       FROM inventory WHERE variant_id IN (:variantIds)`,
      { variantIds },
    );
  },
};
