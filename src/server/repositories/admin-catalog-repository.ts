import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export type HomeSection = "featured" | "new-arrivals" | "special-offers";

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
  sort: number;
  product_count: number;
}

export interface CategoryFields {
  slug: string;
  label: string;
  heroTitle: string;
  title: string;
  description: string;
  heroImageSrc: string;
  heroImageAlt: string;
  heroImagePosition: string | null;
  allLabel: string;
  filterSizes: string[];
  priceMin: number;
  priceMax: number;
  priceStep: number;
  sort: number;
}

export interface SubcategoryRow {
  id: string;
  category_id: string;
  slug: string;
  label: string;
  short_label: string | null;
  sort: number;
  product_count: number;
}

export interface CollectionRow {
  id: string;
  slug: string;
  label: string;
  product_count: number;
}

export interface CategoryCollectionRow {
  category_id: string;
  collection_id: string;
  sort: number;
}

export interface HomeRow {
  section: HomeSection;
  product_id: string;
  product_name: string;
  product_slug: string;
  sort: number;
}

const CATEGORY_SELECT = `SELECT c.id, c.slug, c.label, c.hero_title, c.title, c.description, c.hero_image_src,
    c.hero_image_alt, c.hero_image_position, c.all_label, c.filter_sizes, c.price_min, c.price_max,
    c.price_step, c.sort,
    (SELECT count(*)::int FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) AS product_count
  FROM categories c`;

export const adminCatalogRepository = {
  // ------------------------------------------------------------ categories
  listCategories(tx?: Tx): Promise<CategoryRow[]> {
    return selectRows<CategoryRow>(
      `${CATEGORY_SELECT} ORDER BY c.sort, c.id`,
      {},
      tx,
    );
  },

  async findCategory(id: string, tx?: Tx): Promise<CategoryRow | undefined> {
    const rows = await selectRows<CategoryRow>(
      `${CATEGORY_SELECT} WHERE c.id = :id`,
      { id },
      tx,
    );
    return rows[0];
  },

  async insertCategory(fields: CategoryFields, tx: Tx): Promise<string> {
    const rows = await selectRows<{ id: string }>(
      `INSERT INTO categories (slug, label, hero_title, title, description, hero_image_src, hero_image_alt,
         hero_image_position, all_label, filter_sizes, price_min, price_max, price_step, sort)
       VALUES (:slug, :label, :heroTitle, :title, :description, :heroImageSrc, :heroImageAlt,
         :heroImagePosition, :allLabel,
         ARRAY(SELECT jsonb_array_elements_text(CAST(:filterSizes AS jsonb))),
         :priceMin, :priceMax, :priceStep, :sort)
       RETURNING id`,
      { ...fields, filterSizes: JSON.stringify(fields.filterSizes) },
      tx,
    );
    return rows[0].id;
  },

  async updateCategory(
    id: string,
    fields: Partial<CategoryFields>,
    tx: Tx,
  ): Promise<void> {
    await execute(
      `UPDATE categories SET
         slug = COALESCE(:slug, slug), label = COALESCE(:label, label),
         hero_title = COALESCE(:heroTitle, hero_title), title = COALESCE(:title, title),
         description = COALESCE(:description, description),
         hero_image_src = COALESCE(:heroImageSrc, hero_image_src),
         hero_image_alt = COALESCE(:heroImageAlt, hero_image_alt),
         hero_image_position = CASE WHEN :setPosition THEN :heroImagePosition ELSE hero_image_position END,
         all_label = COALESCE(:allLabel, all_label),
         filter_sizes = CASE WHEN CAST(:filterSizes AS text) IS NULL THEN filter_sizes
           ELSE ARRAY(SELECT jsonb_array_elements_text(CAST(:filterSizes AS jsonb))) END,
         price_min = COALESCE(:priceMin, price_min), price_max = COALESCE(:priceMax, price_max),
         price_step = COALESCE(:priceStep, price_step), sort = COALESCE(:sort, sort)
       WHERE id = :id`,
      {
        id,
        slug: fields.slug ?? null,
        label: fields.label ?? null,
        heroTitle: fields.heroTitle ?? null,
        title: fields.title ?? null,
        description: fields.description ?? null,
        heroImageSrc: fields.heroImageSrc ?? null,
        heroImageAlt: fields.heroImageAlt ?? null,
        // null is a real value here ("no position"), so it needs its own flag.
        setPosition: fields.heroImagePosition !== undefined,
        heroImagePosition: fields.heroImagePosition ?? null,
        allLabel: fields.allLabel ?? null,
        filterSizes: fields.filterSizes
          ? JSON.stringify(fields.filterSizes)
          : null,
        priceMin: fields.priceMin ?? null,
        priceMax: fields.priceMax ?? null,
        priceStep: fields.priceStep ?? null,
        sort: fields.sort ?? null,
      },
      tx,
    );
  },

  async deleteCategory(id: string, tx: Tx): Promise<void> {
    await execute("DELETE FROM categories WHERE id = :id", { id }, tx);
  },

  /** Products of the category, counting hidden and deleted ones: they still point at it. */
  async productsInCategory(id: string, tx?: Tx): Promise<number> {
    const rows = await selectRows<{ n: number }>(
      "SELECT count(*)::int AS n FROM products WHERE category_id = :id",
      { id },
      tx,
    );
    return rows[0].n;
  },

  // --------------------------------------------------------- subcategories
  listSubcategories(tx?: Tx): Promise<SubcategoryRow[]> {
    return selectRows<SubcategoryRow>(
      `SELECT s.id, s.category_id, s.slug, s.label, s.short_label, s.sort,
              (SELECT count(*)::int FROM products p WHERE p.subcategory_id = s.id AND p.deleted_at IS NULL) AS product_count
       FROM subcategories s ORDER BY s.category_id, s.sort, s.id`,
      {},
      tx,
    );
  },

  async findSubcategory(
    id: string,
    tx?: Tx,
  ): Promise<SubcategoryRow | undefined> {
    const rows = await selectRows<SubcategoryRow>(
      `SELECT s.id, s.category_id, s.slug, s.label, s.short_label, s.sort,
              (SELECT count(*)::int FROM products p WHERE p.subcategory_id = s.id AND p.deleted_at IS NULL) AS product_count
       FROM subcategories s WHERE s.id = :id`,
      { id },
      tx,
    );
    return rows[0];
  },

  async insertSubcategory(
    fields: {
      categoryId: string;
      slug: string;
      label: string;
      shortLabel: string | null;
      sort: number;
    },
    tx: Tx,
  ): Promise<string> {
    const rows = await selectRows<{ id: string }>(
      `INSERT INTO subcategories (category_id, slug, label, short_label, sort)
       VALUES (:categoryId, :slug, :label, :shortLabel, :sort) RETURNING id`,
      fields,
      tx,
    );
    return rows[0].id;
  },

  async updateSubcategory(
    id: string,
    fields: {
      slug?: string;
      label?: string;
      shortLabel?: string | null;
      sort?: number;
    },
    tx: Tx,
  ): Promise<void> {
    await execute(
      `UPDATE subcategories SET
         slug = COALESCE(:slug, slug), label = COALESCE(:label, label),
         short_label = CASE WHEN :setShort THEN :shortLabel ELSE short_label END,
         sort = COALESCE(:sort, sort)
       WHERE id = :id`,
      {
        id,
        slug: fields.slug ?? null,
        label: fields.label ?? null,
        setShort: fields.shortLabel !== undefined,
        shortLabel: fields.shortLabel ?? null,
        sort: fields.sort ?? null,
      },
      tx,
    );
  },

  async deleteSubcategory(id: string, tx: Tx): Promise<void> {
    await execute("DELETE FROM subcategories WHERE id = :id", { id }, tx);
  },

  async productsInSubcategory(id: string, tx?: Tx): Promise<number> {
    const rows = await selectRows<{ n: number }>(
      "SELECT count(*)::int AS n FROM products WHERE subcategory_id = :id",
      { id },
      tx,
    );
    return rows[0].n;
  },

  // ----------------------------------------------------------- collections
  listCollections(tx?: Tx): Promise<CollectionRow[]> {
    return selectRows<CollectionRow>(
      `SELECT c.id, c.slug, c.label,
              (SELECT count(*)::int FROM products p WHERE p.collection_id = c.id AND p.deleted_at IS NULL) AS product_count
       FROM collections c ORDER BY c.label, c.id`,
      {},
      tx,
    );
  },

  async findCollection(
    id: string,
    tx?: Tx,
  ): Promise<CollectionRow | undefined> {
    const rows = await selectRows<CollectionRow>(
      `SELECT c.id, c.slug, c.label,
              (SELECT count(*)::int FROM products p WHERE p.collection_id = c.id AND p.deleted_at IS NULL) AS product_count
       FROM collections c WHERE c.id = :id`,
      { id },
      tx,
    );
    return rows[0];
  },

  async insertCollection(
    fields: { slug: string; label: string },
    tx: Tx,
  ): Promise<string> {
    const rows = await selectRows<{ id: string }>(
      "INSERT INTO collections (slug, label) VALUES (:slug, :label) RETURNING id",
      fields,
      tx,
    );
    return rows[0].id;
  },

  async updateCollection(
    id: string,
    fields: { slug?: string; label?: string },
    tx: Tx,
  ): Promise<void> {
    await execute(
      "UPDATE collections SET slug = COALESCE(:slug, slug), label = COALESCE(:label, label) WHERE id = :id",
      { id, slug: fields.slug ?? null, label: fields.label ?? null },
      tx,
    );
  },

  async deleteCollection(id: string, tx: Tx): Promise<void> {
    await execute("DELETE FROM collections WHERE id = :id", { id }, tx);
  },

  listCategoryCollections(tx?: Tx): Promise<CategoryCollectionRow[]> {
    return selectRows<CategoryCollectionRow>(
      "SELECT category_id, collection_id, sort FROM category_collections ORDER BY category_id, sort, collection_id",
      {},
      tx,
    );
  },

  async existingCollectionIds(ids: string[], tx?: Tx): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await selectRows<{ id: string }>(
      "SELECT id FROM collections WHERE id IN (:ids)",
      { ids },
      tx,
    );
    return rows.map((row) => row.id);
  },

  /** Replaces the collections offered by a category, in this order. */
  async setCategoryCollections(
    categoryId: string,
    collectionIds: string[],
    tx: Tx,
  ): Promise<void> {
    await execute(
      "DELETE FROM category_collections WHERE category_id = :categoryId",
      { categoryId },
      tx,
    );
    for (const [sort, collectionId] of collectionIds.entries()) {
      await execute(
        `INSERT INTO category_collections (category_id, collection_id, sort)
         VALUES (:categoryId, :collectionId, :sort)`,
        { categoryId, collectionId, sort },
        tx,
      );
    }
  },

  // ------------------------------------------------------- home sections
  listHome(tx?: Tx): Promise<HomeRow[]> {
    return selectRows<HomeRow>(
      `SELECT h.section, h.product_id, p.name AS product_name, p.slug AS product_slug, h.sort
       FROM home_features h JOIN products p ON p.id = h.product_id
       ORDER BY h.section, h.sort`,
      {},
      tx,
    );
  },

  /** Replaces one home page section with exactly these products, in this order. */
  async setHomeSection(
    section: HomeSection,
    productIds: string[],
    tx: Tx,
  ): Promise<void> {
    await execute(
      "DELETE FROM home_features WHERE section = :section",
      { section },
      tx,
    );
    for (const [sort, productId] of productIds.entries()) {
      await execute(
        "INSERT INTO home_features (section, product_id, sort) VALUES (:section, :productId, :sort)",
        { section, productId, sort },
        tx,
      );
    }
  },

  /** Which of these products exist and are not deleted. */
  async existingProductIds(ids: string[], tx?: Tx): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await selectRows<{ id: string }>(
      "SELECT id FROM products WHERE id IN (:ids) AND deleted_at IS NULL",
      { ids },
      tx,
    );
    return rows.map((row) => row.id);
  },
};
