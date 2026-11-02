import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";
import type { Market } from "@/server/repositories/order-repository";

export interface StockFilter {
  market?: Market;
  /** Matches the product name, SKU, colour or size. */
  search?: string;
  /** Only rows where what can be sold is at or below the low-stock threshold. */
  lowOnly?: boolean;
  productId?: string;
}

export interface StockRow {
  variant_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  product_status: string;
  sku: string;
  color_name: string | null;
  size_label: string | null;
  variant_active: boolean;
  market: Market;
  on_hand: number;
  reserved: number;
  low_stock_threshold: number;
  /** False when the variant has no stock record in this market yet (it counts as 0). */
  has_record: boolean;
}

export interface MovementFilter {
  variantId?: string;
  market?: Market;
  reason?: string;
  from?: Date;
  to?: Date;
}

export interface MovementRow {
  id: string;
  variant_id: string;
  sku: string;
  product_name: string;
  market: Market;
  delta: number;
  reason: string;
  note: string | null;
  order_number: string | null;
  staff_id: string | null;
  staff_name: string | null;
  staff_email: string | null;
  created_at: Date;
}

export interface InventoryLockRow {
  on_hand: number;
  reserved: number;
  low_stock_threshold: number;
}

/** Every variant in both markets, whether or not it has a stock record yet. */
const STOCK_FROM = `FROM product_variants v
  JOIN products p ON p.id = v.product_id AND p.deleted_at IS NULL
  CROSS JOIN (VALUES ('PK'), ('DE')) AS m(market)
  LEFT JOIN inventory i ON i.variant_id = v.id AND i.market = m.market`;

const STOCK_COLUMNS = `v.id AS variant_id, p.id AS product_id, p.name AS product_name, p.slug AS product_slug,
  p.status AS product_status, v.sku, v.color_name, v.size_label, v.active AS variant_active,
  m.market, COALESCE(i.on_hand, 0) AS on_hand, COALESCE(i.reserved, 0) AS reserved,
  COALESCE(i.low_stock_threshold, 3) AS low_stock_threshold, (i.variant_id IS NOT NULL) AS has_record`;

function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

function stockWhere(filter: StockFilter): {
  where: string;
  replacements: Record<string, unknown>;
} {
  return {
    where: `WHERE (CAST(:market AS text) IS NULL OR m.market = :market)
      AND (CAST(:productId AS uuid) IS NULL OR p.id = CAST(:productId AS uuid))
      AND (CAST(:search AS text) IS NULL OR p.name ILIKE :pattern OR v.sku ILIKE :pattern
           OR v.color_name ILIKE :pattern OR v.size_label ILIKE :pattern)
      AND (NOT :lowOnly
           OR COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0) <= COALESCE(i.low_stock_threshold, 3))`,
    replacements: {
      market: filter.market ?? null,
      productId: filter.productId ?? null,
      search: filter.search ?? null,
      pattern: likePattern(filter.search ?? ""),
      lowOnly: filter.lowOnly ?? false,
    },
  };
}

export const adminStockRepository = {
  async list(
    filter: StockFilter,
    limit: number,
    offset: number,
  ): Promise<{ rows: StockRow[]; total: number }> {
    const { where, replacements } = stockWhere(filter);
    const [rows, count] = await Promise.all([
      selectRows<StockRow>(
        `SELECT ${STOCK_COLUMNS} ${STOCK_FROM} ${where}
         ORDER BY p.sort, p.name, v.sort, v.sku, m.market LIMIT :limit OFFSET :offset`,
        { ...replacements, limit, offset },
      ),
      selectRows<{ n: number }>(
        `SELECT count(*)::int AS n ${STOCK_FROM} ${where}`,
        replacements,
      ),
    ]);
    return { rows, total: count[0].n };
  },

  async findOne(
    variantId: string,
    market: Market,
    tx?: Tx,
  ): Promise<StockRow | undefined> {
    const rows = await selectRows<StockRow>(
      `SELECT ${STOCK_COLUMNS} ${STOCK_FROM} WHERE v.id = :variantId AND m.market = :market`,
      { variantId, market },
      tx,
    );
    return rows[0];
  },

  /**
   * Makes sure the variant has a stock record in this market and locks it, so
   * two changes (or a change and a sale) cannot overlap. A missing record is
   * created empty first.
   */
  async lockRecord(
    variantId: string,
    market: Market,
    tx: Tx,
  ): Promise<InventoryLockRow> {
    await execute(
      `INSERT INTO inventory (variant_id, market, on_hand) VALUES (:variantId, :market, 0)
       ON CONFLICT (variant_id, market) DO NOTHING`,
      { variantId, market },
      tx,
    );
    const rows = await selectRows<InventoryLockRow>(
      `SELECT on_hand, reserved, low_stock_threshold FROM inventory
       WHERE variant_id = :variantId AND market = :market FOR UPDATE`,
      { variantId, market },
      tx,
    );
    return rows[0];
  },

  async setOnHand(
    variantId: string,
    market: Market,
    onHand: number,
    tx: Tx,
  ): Promise<void> {
    await execute(
      "UPDATE inventory SET on_hand = :onHand WHERE variant_id = :variantId AND market = :market",
      { variantId, market, onHand },
      tx,
    );
  },

  async setThreshold(
    variantId: string,
    market: Market,
    threshold: number,
    tx: Tx,
  ): Promise<void> {
    await execute(
      "UPDATE inventory SET low_stock_threshold = :threshold WHERE variant_id = :variantId AND market = :market",
      { variantId, market, threshold },
      tx,
    );
  },

  async insertMovement(
    movement: {
      variantId: string;
      market: Market;
      delta: number;
      reason: "adjustment" | "correction";
      note: string | null;
      staffId: string;
    },
    tx: Tx,
  ): Promise<void> {
    await execute(
      `INSERT INTO stock_movements (variant_id, market, delta, reason, note, staff_id)
       VALUES (:variantId, :market, :delta, :reason, :note, :staffId)`,
      movement,
      tx,
    );
  },

  async variantExists(variantId: string, tx?: Tx): Promise<boolean> {
    const rows = await selectRows(
      `SELECT 1 FROM product_variants v JOIN products p ON p.id = v.product_id
       WHERE v.id = :variantId AND p.deleted_at IS NULL`,
      { variantId },
      tx,
    );
    return rows.length > 0;
  },

  async listMovements(
    filter: MovementFilter,
    limit: number,
    offset: number,
  ): Promise<{ rows: MovementRow[]; total: number }> {
    const replacements = {
      variantId: filter.variantId ?? null,
      market: filter.market ?? null,
      reason: filter.reason ?? null,
      from: filter.from ?? null,
      to: filter.to ?? null,
    };
    const where = `WHERE (CAST(:variantId AS uuid) IS NULL OR sm.variant_id = CAST(:variantId AS uuid))
      AND (CAST(:market AS text) IS NULL OR sm.market = :market)
      AND (CAST(:reason AS text) IS NULL OR sm.reason = :reason)
      AND (CAST(:from AS timestamptz) IS NULL OR sm.created_at >= CAST(:from AS timestamptz))
      AND (CAST(:to AS timestamptz) IS NULL OR sm.created_at < CAST(:to AS timestamptz))`;
    const from = `FROM stock_movements sm
      JOIN product_variants v ON v.id = sm.variant_id
      JOIN products p ON p.id = v.product_id
      LEFT JOIN orders o ON o.id = sm.order_id
      LEFT JOIN staff s ON s.id = sm.staff_id`;

    const [rows, count] = await Promise.all([
      selectRows<MovementRow>(
        `SELECT sm.id::text AS id, sm.variant_id, v.sku, p.name AS product_name, sm.market, sm.delta,
                sm.reason, sm.note, o.number AS order_number, sm.staff_id,
                CASE WHEN s.id IS NULL THEN NULL ELSE s.first_name || ' ' || s.last_name END AS staff_name,
                s.email::text AS staff_email, sm.created_at
         ${from} ${where}
         ORDER BY sm.created_at DESC, sm.id DESC LIMIT :limit OFFSET :offset`,
        { ...replacements, limit, offset },
      ),
      selectRows<{ n: number }>(
        `SELECT count(*)::int AS n ${from} ${where}`,
        replacements,
      ),
    ]);
    return { rows, total: count[0].n };
  },
};
