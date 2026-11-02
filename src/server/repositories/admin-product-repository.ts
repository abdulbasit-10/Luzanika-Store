import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";
import type { Market } from "@/server/repositories/order-repository";

export interface ImageRow {
  id: string;
  src: string;
  alt: string;
  position: string | null;
  sort: number;
}

export type ProductStatus = "draft" | "active" | "archived";
export type DeletedFilter = "exclude" | "include" | "only";

export interface ProductFilter {
  /** Matches the name, slug or the SKU of any variant. */
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  listed?: boolean;
  deleted: DeletedFilter;
}

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  collection_id: string | null;
  category_slug: string | null;
  category_label: string | null;
  subcategory_label: string | null;
  collection_label: string | null;
  availability: string | null;
  badge_label: string | null;
  badge_tone: "dark" | "light" | null;
  is_new: boolean;
  notes: string[];
  has_size_guide: boolean;
  listed: boolean;
  status: ProductStatus;
  sort: number;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  /** Only in lists. */
  image_src?: string | null;
  image_alt?: string | null;
  variant_count?: number;
}

export interface PriceRow {
  product_id: string;
  market: Market;
  currency: "PKR" | "EUR";
  amount: string;
  compare_at_amount: string | null;
}

export interface VariantRow {
  id: string;
  product_id: string;
  sku: string;
  color_name: string | null;
  color_hex: string | null;
  size_label: string | null;
  sort: number;
  active: boolean;
}

export interface VariantStockRow {
  variant_id: string;
  market: Market;
  on_hand: number;
  reserved: number;
}

export interface SectionRow {
  title: string;
  body: string;
}

/** The product fields staff can change. Each maps to one column; names that are not here are never written. */
export interface ProductChanges {
  slug?: string;
  name?: string;
  tagline?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  collectionId?: string | null;
  availability?: string | null;
  badgeLabel?: string | null;
  badgeTone?: "dark" | "light" | null;
  isNew?: boolean;
  notes?: string[];
  hasSizeGuide?: boolean;
  listed?: boolean;
  status?: ProductStatus;
  sort?: number;
}

const PRODUCT_COLUMNS: Record<keyof ProductChanges, { column: string; cast?: string }> = {
  slug: { column: "slug" },
  name: { column: "name" },
  tagline: { column: "tagline" },
  categoryId: { column: "category_id", cast: "uuid" },
  subcategoryId: { column: "subcategory_id", cast: "uuid" },
  collectionId: { column: "collection_id", cast: "uuid" },
  availability: { column: "availability" },
  badgeLabel: { column: "badge_label" },
  badgeTone: { column: "badge_tone" },
  isNew: { column: "is_new" },
  notes: { column: "notes" },
  hasSizeGuide: { column: "has_size_guide" },
  listed: { column: "listed" },
  status: { column: "status" },
  sort: { column: "sort" },
};

export interface VariantChanges {
  sku?: string;
  colorName?: string | null;
  colorHex?: string | null;
  sizeLabel?: string | null;
  sort?: number;
  active?: boolean;
}

const VARIANT_COLUMNS: Record<keyof VariantChanges, string> = {
  sku: "sku",
  colorName: "color_name",
  colorHex: "color_hex",
  sizeLabel: "size_label",
  sort: "sort",
  active: "active",
};

/**
 * Builds "column = :param, ..." for exactly the fields given. The column names
 * come from the fixed maps above, never from the request, and every value is a bound parameter.
 */
function setClause<T extends object>(
  changes: T,
  columns: Record<string, string | { column: string; cast?: string }>,
): { sql: string; values: Record<string, unknown> } {
  const parts: string[] = [];
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    const target = columns[key];
    if (!target) throw new Error(`Unknown field: ${key}`);
    const { column, cast } =
      typeof target === "string" ? { column: target, cast: undefined } : target;
    const param = `v_${key}`;
    if (Array.isArray(value)) {
      parts.push(
        `${column} = ARRAY(SELECT jsonb_array_elements_text(CAST(:${param} AS jsonb)))`,
      );
      values[param] = JSON.stringify(value);
    } else {
      parts.push(`${column} = ${cast ? `CAST(:${param} AS ${cast})` : `:${param}`}`);
      values[param] = value;
    }
  }
  return { sql: parts.join(", "), values };
}

function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

const PRODUCT_SELECT = `SELECT p.id, p.slug, p.name, p.tagline, p.category_id, p.subcategory_id, p.collection_id,
    c.slug AS category_slug, c.label AS category_label, s.label AS subcategory_label,
    col.label AS collection_label, p.availability, p.badge_label, p.badge_tone, p.is_new, p.notes,
    p.has_size_guide, p.listed, p.status, p.sort, p.deleted_at, p.created_at, p.updated_at
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN subcategories s ON s.id = p.subcategory_id
  LEFT JOIN collections col ON col.id = p.collection_id`;

export const adminProductRepository = {
  async list(
    filter: ProductFilter,
    limit: number,
    offset: number,
  ): Promise<{ rows: ProductRow[]; total: number }> {
    const replacements = {
      search: filter.search ?? null,
      pattern: likePattern(filter.search ?? ""),
      status: filter.status ?? null,
      categoryId: filter.categoryId ?? null,
      listed: filter.listed ?? null,
      deleted: filter.deleted,
    };
    const where = `WHERE (CAST(:status AS text) IS NULL OR p.status = :status)
      AND (CAST(:categoryId AS uuid) IS NULL OR p.category_id = CAST(:categoryId AS uuid))
      AND (CAST(:listed AS boolean) IS NULL OR p.listed = CAST(:listed AS boolean))
      AND (:deleted = 'include' OR (:deleted = 'exclude' AND p.deleted_at IS NULL)
           OR (:deleted = 'only' AND p.deleted_at IS NOT NULL))
      AND (CAST(:search AS text) IS NULL OR p.name ILIKE :pattern OR p.slug ILIKE :pattern
           OR EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.sku ILIKE :pattern))`;

    const [rows, count] = await Promise.all([
      selectRows<ProductRow>(
        `SELECT p.id, p.slug, p.name, p.tagline, p.category_id, p.subcategory_id, p.collection_id,
                c.slug AS category_slug, c.label AS category_label, s.label AS subcategory_label,
                col.label AS collection_label, p.availability, p.badge_label, p.badge_tone, p.is_new,
                p.notes, p.has_size_guide, p.listed, p.status, p.sort, p.deleted_at, p.created_at, p.updated_at,
                (SELECT src FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort LIMIT 1) AS image_src,
                (SELECT alt FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort LIMIT 1) AS image_alt,
                (SELECT count(*)::int FROM product_variants v WHERE v.product_id = p.id) AS variant_count
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN subcategories s ON s.id = p.subcategory_id
         LEFT JOIN collections col ON col.id = p.collection_id
         ${where} ORDER BY p.sort, p.created_at, p.id LIMIT :limit OFFSET :offset`,
        { ...replacements, limit, offset },
      ),
      selectRows<{ n: number }>(
        `SELECT count(*)::int AS n FROM products p ${where}`,
        replacements,
      ),
    ]);
    return { rows, total: count[0].n };
  },

  async findById(id: string, tx?: Tx): Promise<ProductRow | undefined> {
    const rows = await selectRows<ProductRow>(
      `${PRODUCT_SELECT} WHERE p.id = :id`,
      { id },
      tx,
    );
    return rows[0];
  },

  /** Locks the product row so edits, deletion and activation cannot overlap. */
  async lockById(id: string, tx: Tx): Promise<ProductRow | undefined> {
    const rows = await selectRows<ProductRow>(
      `${PRODUCT_SELECT} WHERE p.id = :id FOR UPDATE OF p`,
      { id },
      tx,
    );
    return rows[0];
  },

  async slugExists(slug: string, exceptId?: string, tx?: Tx): Promise<boolean> {
    const rows = await selectRows(
      "SELECT 1 FROM products WHERE slug = :slug AND (CAST(:exceptId AS uuid) IS NULL OR id <> CAST(:exceptId AS uuid))",
      { slug, exceptId: exceptId ?? null },
      tx,
    );
    return rows.length > 0;
  },

  async insert(
    fields: Required<
      Pick<
        ProductChanges,
        "slug" | "name" | "isNew" | "notes" | "hasSizeGuide" | "listed"
      >
    > &
      Omit<ProductChanges, "slug" | "name" | "isNew" | "notes" | "hasSizeGuide" | "listed" | "status" | "sort">,
    tx: Tx,
  ): Promise<string> {
    const rows = await selectRows<{ id: string }>(
      `INSERT INTO products (slug, name, tagline, category_id, subcategory_id, collection_id, availability,
         badge_label, badge_tone, is_new, notes, has_size_guide, listed, status, sort)
       VALUES (:slug, :name, :tagline, CAST(:categoryId AS uuid), CAST(:subcategoryId AS uuid),
         CAST(:collectionId AS uuid), :availability, :badgeLabel, :badgeTone, :isNew,
         ARRAY(SELECT jsonb_array_elements_text(CAST(:notes AS jsonb))), :hasSizeGuide, :listed, 'draft',
         (SELECT COALESCE(max(sort), 0) + 10 FROM products))
       RETURNING id`,
      {
        slug: fields.slug,
        name: fields.name,
        tagline: fields.tagline ?? null,
        categoryId: fields.categoryId ?? null,
        subcategoryId: fields.subcategoryId ?? null,
        collectionId: fields.collectionId ?? null,
        availability: fields.availability ?? null,
        badgeLabel: fields.badgeLabel ?? null,
        badgeTone: fields.badgeTone ?? null,
        isNew: fields.isNew,
        notes: JSON.stringify(fields.notes),
        hasSizeGuide: fields.hasSizeGuide,
        listed: fields.listed,
      },
      tx,
    );
    return rows[0].id;
  },

  async update(id: string, changes: ProductChanges, tx: Tx): Promise<void> {
    const { sql, values } = setClause(changes, PRODUCT_COLUMNS);
    if (!sql) return;
    await execute(`UPDATE products SET ${sql} WHERE id = :id`, { id, ...values }, tx);
  },

  async softDelete(id: string, tx: Tx): Promise<void> {
    await execute(
      "UPDATE products SET deleted_at = now(), status = 'archived' WHERE id = :id",
      { id },
      tx,
    );
  },

  async restore(id: string, tx: Tx): Promise<void> {
    await execute(
      "UPDATE products SET deleted_at = NULL, status = 'draft' WHERE id = :id",
      { id },
      tx,
    );
  },

  // ---------------------------------------------------------------- prices
  listPrices(productIds: string[], tx?: Tx): Promise<PriceRow[]> {
    if (productIds.length === 0) return Promise.resolve([]);
    return selectRows<PriceRow>(
      `SELECT product_id, market, currency, amount, compare_at_amount
       FROM product_prices WHERE product_id IN (:productIds)`,
      { productIds },
      tx,
    );
  },

  async upsertPrice(
    productId: string,
    market: Market,
    price: { amount: number; compareAtAmount: number | null },
    tx: Tx,
  ): Promise<void> {
    await execute(
      `INSERT INTO product_prices (product_id, market, currency, amount, compare_at_amount)
       VALUES (:productId, :market, :currency, :amount, :compareAtAmount)
       ON CONFLICT (product_id, market)
       DO UPDATE SET amount = EXCLUDED.amount, compare_at_amount = EXCLUDED.compare_at_amount`,
      {
        productId,
        market,
        currency: market === "PK" ? "PKR" : "EUR",
        ...price,
      },
      tx,
    );
  },

  async deletePrice(productId: string, market: Market, tx: Tx): Promise<void> {
    await execute(
      "DELETE FROM product_prices WHERE product_id = :productId AND market = :market",
      { productId, market },
      tx,
    );
  },

  async countPrices(productId: string, tx?: Tx): Promise<number> {
    const rows = await selectRows<{ n: number }>(
      "SELECT count(*)::int AS n FROM product_prices WHERE product_id = :productId",
      { productId },
      tx,
    );
    return rows[0].n;
  },

  // -------------------------------------------------------------- variants
  listVariants(productIds: string[], tx?: Tx): Promise<VariantRow[]> {
    if (productIds.length === 0) return Promise.resolve([]);
    return selectRows<VariantRow>(
      `SELECT id, product_id, sku, color_name, color_hex, size_label, sort, active
       FROM product_variants WHERE product_id IN (:productIds) ORDER BY product_id, sort, id`,
      { productIds },
      tx,
    );
  },

  async findVariant(id: string, tx?: Tx): Promise<VariantRow | undefined> {
    const rows = await selectRows<VariantRow>(
      `SELECT id, product_id, sku, color_name, color_hex, size_label, sort, active
       FROM product_variants WHERE id = :id`,
      { id },
      tx,
    );
    return rows[0];
  },

  async lockVariant(id: string, tx: Tx): Promise<VariantRow | undefined> {
    const rows = await selectRows<VariantRow>(
      `SELECT id, product_id, sku, color_name, color_hex, size_label, sort, active
       FROM product_variants WHERE id = :id FOR UPDATE`,
      { id },
      tx,
    );
    return rows[0];
  },

  async insertVariant(
    variant: {
      productId: string;
      sku: string;
      colorName: string | null;
      colorHex: string | null;
      sizeLabel: string | null;
      sort: number | null;
      active: boolean;
    },
    tx: Tx,
  ): Promise<string> {
    const rows = await selectRows<{ id: string }>(
      `INSERT INTO product_variants (product_id, sku, color_name, color_hex, size_label, sort, active)
       VALUES (:productId, :sku, :colorName, :colorHex, :sizeLabel,
         COALESCE(:sort, (SELECT COALESCE(max(sort), 0) + 10 FROM product_variants WHERE product_id = :productId)),
         :active)
       RETURNING id`,
      variant,
      tx,
    );
    return rows[0].id;
  },

  async updateVariant(
    id: string,
    changes: VariantChanges,
    tx: Tx,
  ): Promise<void> {
    const { sql, values } = setClause(changes, VARIANT_COLUMNS);
    if (!sql) return;
    await execute(
      `UPDATE product_variants SET ${sql} WHERE id = :id`,
      { id, ...values },
      tx,
    );
  },

  async countActiveVariants(productId: string, tx?: Tx): Promise<number> {
    const rows = await selectRows<{ n: number }>(
      "SELECT count(*)::int AS n FROM product_variants WHERE product_id = :productId AND active",
      { productId },
      tx,
    );
    return rows[0].n;
  },

  listVariantStock(variantIds: string[], tx?: Tx): Promise<VariantStockRow[]> {
    if (variantIds.length === 0) return Promise.resolve([]);
    return selectRows<VariantStockRow>(
      `SELECT variant_id, market, on_hand, reserved FROM inventory WHERE variant_id IN (:variantIds)`,
      { variantIds },
      tx,
    );
  },

  /** Available units (on hand minus reserved) of the active variants of each product, per market. */
  listAvailableByProduct(
    productIds: string[],
    tx?: Tx,
  ): Promise<{ product_id: string; market: Market; available: string }[]> {
    if (productIds.length === 0) return Promise.resolve([]);
    return selectRows(
      `SELECT v.product_id, i.market, sum(i.on_hand - i.reserved) AS available
       FROM inventory i JOIN product_variants v ON v.id = i.variant_id AND v.active
       WHERE v.product_id IN (:productIds) GROUP BY v.product_id, i.market`,
      { productIds },
      tx,
    );
  },

  /** Writes the first stock of a new variant, with the person who entered it in the ledger. */
  async addInitialStock(
    input: {
      variantId: string;
      market: Market;
      quantity: number;
      staffId: string;
    },
    tx: Tx,
  ): Promise<void> {
    await execute(
      `INSERT INTO inventory (variant_id, market, on_hand) VALUES (:variantId, :market, :quantity)
       ON CONFLICT (variant_id, market) DO UPDATE SET on_hand = inventory.on_hand + EXCLUDED.on_hand`,
      input,
      tx,
    );
    await execute(
      `INSERT INTO stock_movements (variant_id, market, delta, reason, note, staff_id)
       VALUES (:variantId, :market, :quantity, 'adjustment', 'First stock of a new variant', :staffId)`,
      input,
      tx,
    );
  },

  // -------------------------------------------------------------- sections
  listSections(productId: string, tx?: Tx): Promise<SectionRow[]> {
    return selectRows<SectionRow>(
      "SELECT title, body FROM product_detail_sections WHERE product_id = :productId ORDER BY sort",
      { productId },
      tx,
    );
  },

  /** Replaces the detail cards of a product with exactly these, in this order. */
  async setSections(
    productId: string,
    sections: { title: string; body: string }[],
    tx: Tx,
  ): Promise<void> {
    await execute(
      "DELETE FROM product_detail_sections WHERE product_id = :productId",
      { productId },
      tx,
    );
    for (const [sort, section] of sections.entries()) {
      await execute(
        `INSERT INTO product_detail_sections (product_id, title, body, sort)
         VALUES (:productId, :title, :body, :sort)`,
        { productId, ...section, sort },
        tx,
      );
    }
  },

  // ---------------------------------------------------------------- images
  listImages(
    productId: string,
    tx?: Tx,
  ): Promise<
    { id: string; src: string; alt: string; position: string | null; sort: number }[]
  > {
    return selectRows(
      `SELECT id, src, alt, position, sort FROM product_images
       WHERE product_id = :productId ORDER BY sort`,
      { productId },
      tx,
    );
  },

  findImage(
    productId: string,
    imageId: string,
    tx: Tx,
  ): Promise<ImageRow | undefined> {
    return selectRows<ImageRow>(
      `SELECT id, src, alt, position, sort FROM product_images
       WHERE product_id = :productId AND id = :imageId FOR UPDATE`,
      { productId, imageId },
      tx,
    ).then((rows) => rows[0]);
  },

  async countImages(productId: string, tx: Tx): Promise<number> {
    const rows = await selectRows<{ n: string }>(
      "SELECT count(*) AS n FROM product_images WHERE product_id = :productId",
      { productId },
      tx,
    );
    return Number(rows[0].n);
  },

  /** Adds a photo after the last one. */
  async insertImage(
    image: { productId: string; src: string; alt: string },
    tx: Tx,
  ): Promise<ImageRow> {
    const rows = await selectRows<ImageRow>(
      `INSERT INTO product_images (product_id, src, alt, sort)
       VALUES (:productId, :src, :alt,
         (SELECT COALESCE(max(sort) + 1, 0) FROM product_images WHERE product_id = :productId))
       RETURNING id, src, alt, position, sort`,
      image,
      tx,
    );
    return rows[0];
  },

  async updateImage(
    imageId: string,
    changes: { alt?: string; position?: string | null },
    tx: Tx,
  ): Promise<void> {
    await execute(
      `UPDATE product_images
       SET alt = COALESCE(CAST(:alt AS text), alt),
           position = CASE WHEN :setPosition THEN CAST(:position AS text) ELSE position END
       WHERE id = :imageId`,
      {
        imageId,
        alt: changes.alt ?? null,
        setPosition: changes.position !== undefined,
        position: changes.position ?? null,
      },
      tx,
    );
  },

  async deleteImage(imageId: string, tx: Tx): Promise<void> {
    await execute("DELETE FROM product_images WHERE id = :imageId", { imageId }, tx);
  },

  /** Numbers the photos 0, 1, 2... in the order of `ids` (the unique sort is checked at the end of the transaction). */
  async setImageOrder(ids: string[], tx: Tx): Promise<void> {
    for (const [sort, imageId] of ids.entries()) {
      await execute(
        "UPDATE product_images SET sort = :sort WHERE id = :imageId",
        { sort, imageId },
        tx,
      );
    }
  },
};
