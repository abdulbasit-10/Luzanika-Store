import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export type DiscountStatus = "active" | "scheduled" | "ended" | "off";
export type DiscountMarket = "PK" | "DE";

export interface DiscountRow {
  id: string;
  name: string;
  percent: number;
  markets: DiscountMarket[];
  starts_at: Date | null;
  ends_at: Date | null;
  active: boolean;
  status: DiscountStatus;
  product_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface DiscountProductRow {
  id: string;
  name: string;
  slug: string;
  /** The category label ("Kids"), so two products with the same name can be told apart. */
  category: string | null;
}

export interface DiscountFilter {
  status?: DiscountStatus;
  /** Matches the discount name. */
  search?: string;
}

/** The state of a discount right now: switched off beats everything, then the dates decide. */
const STATUS_SQL = `CASE
    WHEN NOT d.active THEN 'off'
    WHEN d.starts_at IS NOT NULL AND d.starts_at > now() THEN 'scheduled'
    WHEN d.ends_at IS NOT NULL AND d.ends_at <= now() THEN 'ended'
    ELSE 'active' END`;

const COLUMNS = `d.id, d.name, d.percent, d.markets, d.starts_at, d.ends_at, d.active, ${STATUS_SQL} AS status,
  (SELECT count(*)::int FROM discount_products dp WHERE dp.discount_id = d.id) AS product_count,
  d.created_at, d.updated_at`;

function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

export interface DiscountWrite {
  name: string;
  percent: number;
  markets: DiscountMarket[];
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
}

export const discountRepository = {
  async list(
    filter: DiscountFilter,
    limit: number,
    offset: number,
  ): Promise<{ rows: DiscountRow[]; total: number }> {
    const replacements = {
      status: filter.status ?? null,
      search: filter.search ?? null,
      pattern: likePattern(filter.search ?? ""),
    };
    const where = `WHERE (CAST(:status AS text) IS NULL OR (${STATUS_SQL}) = :status)
      AND (CAST(:search AS text) IS NULL OR d.name ILIKE :pattern)`;
    const [rows, count] = await Promise.all([
      selectRows<DiscountRow>(
        `SELECT ${COLUMNS} FROM discounts d ${where}
         ORDER BY d.created_at DESC, d.id LIMIT :limit OFFSET :offset`,
        { ...replacements, limit, offset },
      ),
      selectRows<{ n: number }>(
        `SELECT count(*)::int AS n FROM discounts d ${where}`,
        replacements,
      ),
    ]);
    return { rows, total: count[0].n };
  },

  async find(id: string, tx?: Tx): Promise<DiscountRow | undefined> {
    const rows = await selectRows<DiscountRow>(
      `SELECT ${COLUMNS} FROM discounts d WHERE d.id = :id`,
      { id },
      tx,
    );
    return rows[0];
  },

  /** Locks the discount so two staff members changing it at once cannot mix their changes. */
  async lock(id: string, tx: Tx): Promise<DiscountRow | undefined> {
    const rows = await selectRows<DiscountRow>(
      `SELECT ${COLUMNS} FROM discounts d WHERE d.id = :id FOR UPDATE OF d`,
      { id },
      tx,
    );
    return rows[0];
  },

  listProducts(discountId: string, tx?: Tx): Promise<DiscountProductRow[]> {
    return selectRows<DiscountProductRow>(
      `SELECT p.id, p.name, p.slug, c.label AS category FROM discount_products dp
       JOIN products p ON p.id = dp.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE dp.discount_id = :discountId ORDER BY p.name, p.id`,
      { discountId },
      tx,
    );
  },

  /** Which of these ids are products that exist (and are not deleted). */
  async existingProductIds(ids: string[], tx: Tx): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await selectRows<{ id: string }>(
      `SELECT id FROM products WHERE id IN (:ids) AND deleted_at IS NULL`,
      { ids },
      tx,
    );
    return new Set(rows.map((row) => row.id));
  },

  async insert(
    input: DiscountWrite & { staffId: string },
    tx: Tx,
  ): Promise<string> {
    const rows = await selectRows<{ id: string }>(
      `INSERT INTO discounts (name, percent, markets, starts_at, ends_at, active, created_by, updated_by)
       VALUES (:name, :percent, ARRAY[:markets]::text[], :startsAt, :endsAt, :active, :staffId, :staffId)
       RETURNING id`,
      { ...input },
      tx,
    );
    return rows[0].id;
  },

  update(
    id: string,
    input: DiscountWrite & { staffId: string },
    tx: Tx,
  ): Promise<number> {
    return execute(
      `UPDATE discounts SET name = :name, percent = :percent, markets = ARRAY[:markets]::text[],
         starts_at = :startsAt, ends_at = :endsAt, active = :active, updated_by = :staffId
       WHERE id = :id`,
      { id, ...input },
      tx,
    );
  },

  async replaceProducts(
    discountId: string,
    productIds: string[],
    tx: Tx,
  ): Promise<void> {
    await execute(
      "DELETE FROM discount_products WHERE discount_id = :discountId",
      { discountId },
      tx,
    );
    if (productIds.length === 0) return;
    await execute(
      `INSERT INTO discount_products (discount_id, product_id)
       SELECT :discountId, p FROM unnest(ARRAY[:productIds]::uuid[]) AS p`,
      { discountId, productIds },
      tx,
    );
  },

  delete(id: string, tx: Tx): Promise<number> {
    return execute("DELETE FROM discounts WHERE id = :id", { id }, tx);
  },

  /** Products to pick from: not deleted, matching the name, the slug or a SKU. */
  productOptions(
    search: string | undefined,
    limit: number,
  ): Promise<DiscountProductRow[]> {
    return selectRows<DiscountProductRow>(
      `SELECT p.id, p.name, p.slug, c.label AS category FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.deleted_at IS NULL
         AND (CAST(:search AS text) IS NULL OR p.name ILIKE :pattern OR p.slug ILIKE :pattern
              OR EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.sku ILIKE :pattern))
       ORDER BY p.name, p.id LIMIT :limit`,
      {
        search: search ?? null,
        pattern: likePattern(search ?? ""),
        limit,
      },
    );
  },
};
