import "server-only";

import { selectRows } from "@/server/db/query";
import type { Market } from "@/server/repositories/order-repository";

export interface Period {
  from: Date;
  to: Date;
  market: Market | null;
}

export interface StatusCount {
  market: Market;
  status: string;
  n: number;
}

export interface MarketAmount {
  market: Market;
  n: number;
  amount: number;
}

export interface DayAmount {
  day: string;
  market: Market;
  n: number;
  amount: number;
}

export interface LowStockRow {
  variant_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  color_name: string | null;
  size_label: string | null;
  market: Market;
  on_hand: number;
  reserved: number;
  low_stock_threshold: number;
}

export interface RecentOrderRow {
  number: string;
  market: Market;
  currency: string;
  status: string;
  payment_status: string;
  total: string;
  ship_name: string;
  email: string;
  placed_at: Date;
}

const params = (period: Period) => ({
  from: period.from,
  to: period.to,
  market: period.market,
});

const MARKET_FILTER = "(CAST(:market AS text) IS NULL OR o.market = :market)";
const DAY = (column: string) =>
  `to_char(date_trunc('day', ${column} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`;

/** Read-only numbers for the dashboard. Amounts are minor units of each market's own currency; sums are never mixed across markets. */
export const adminDashboardRepository = {
  /** Orders placed in the period, by market and status. */
  ordersByStatus(period: Period): Promise<StatusCount[]> {
    return selectRows<StatusCount>(
      `SELECT o.market, o.status, count(*)::int AS n FROM orders o
       WHERE o.placed_at >= :from AND o.placed_at < :to AND ${MARKET_FILTER}
       GROUP BY o.market, o.status`,
      params(period),
    );
  },

  /** Orders that were paid in the period, and what they were worth. */
  async paid(period: Period): Promise<MarketAmount[]> {
    const rows = await selectRows<{
      market: Market;
      n: number;
      amount: string;
    }>(
      `SELECT o.market, count(*)::int AS n, COALESCE(sum(o.total), 0)::text AS amount FROM orders o
       WHERE o.paid_at >= :from AND o.paid_at < :to AND ${MARKET_FILTER}
       GROUP BY o.market`,
      params(period),
    );
    return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
  },

  /** Money refunded in the period (refunds made in it, whenever the order was paid). */
  async refunded(period: Period): Promise<MarketAmount[]> {
    const rows = await selectRows<{
      market: Market;
      n: number;
      amount: string;
    }>(
      `SELECT o.market, count(*)::int AS n, COALESCE(sum(r.amount), 0)::text AS amount
       FROM refunds r JOIN orders o ON o.id = r.order_id
       WHERE r.created_at >= :from AND r.created_at < :to AND ${MARKET_FILTER}
       GROUP BY o.market`,
      params(period),
    );
    return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
  },

  /** Right now (not limited to the period): orders waiting for payment, and paid orders waiting to be shipped. */
  currentBacklog(market: Market | null): Promise<StatusCount[]> {
    return selectRows<StatusCount>(
      `SELECT o.market, o.status, count(*)::int AS n FROM orders o
       WHERE o.status IN ('waiting_payment', 'processing') AND ${MARKET_FILTER}
       GROUP BY o.market, o.status`,
      { market },
    );
  },

  async newCustomers(period: Period): Promise<number> {
    const rows = await selectRows<{ n: number }>(
      `SELECT count(*)::int AS n FROM customers
       WHERE created_at >= :from AND created_at < :to AND status <> 'anonymised'`,
      params(period),
    );
    return rows[0].n;
  },

  /** Orders placed per day (UTC) and market. */
  ordersPerDay(period: Period): Promise<DayAmount[]> {
    return selectRows<DayAmount>(
      `SELECT ${DAY("o.placed_at")} AS day, o.market, count(*)::int AS n, 0 AS amount FROM orders o
       WHERE o.placed_at >= :from AND o.placed_at < :to AND ${MARKET_FILTER}
       GROUP BY 1, o.market`,
      params(period),
    );
  },

  async paidPerDay(period: Period): Promise<DayAmount[]> {
    const rows = await selectRows<
      Omit<DayAmount, "amount"> & { amount: string }
    >(
      `SELECT ${DAY("o.paid_at")} AS day, o.market, count(*)::int AS n, COALESCE(sum(o.total), 0)::text AS amount
       FROM orders o
       WHERE o.paid_at >= :from AND o.paid_at < :to AND ${MARKET_FILTER}
       GROUP BY 1, o.market`,
      params(period),
    );
    return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
  },

  async refundedPerDay(period: Period): Promise<DayAmount[]> {
    const rows = await selectRows<
      Omit<DayAmount, "amount"> & { amount: string }
    >(
      `SELECT ${DAY("r.created_at")} AS day, o.market, count(*)::int AS n, COALESCE(sum(r.amount), 0)::text AS amount
       FROM refunds r JOIN orders o ON o.id = r.order_id
       WHERE r.created_at >= :from AND r.created_at < :to AND ${MARKET_FILTER}
       GROUP BY 1, o.market`,
      params(period),
    );
    return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
  },

  /** Variants on sale that are at or below their low-stock threshold, the lowest first. */
  lowStock(market: Market | null, limit: number): Promise<LowStockRow[]> {
    return selectRows<LowStockRow>(
      `SELECT v.id AS variant_id, p.id AS product_id, p.name AS product_name, v.sku, v.color_name, v.size_label,
              m.market, COALESCE(i.on_hand, 0) AS on_hand, COALESCE(i.reserved, 0) AS reserved,
              COALESCE(i.low_stock_threshold, 3) AS low_stock_threshold
       FROM product_variants v
       JOIN products p ON p.id = v.product_id AND p.deleted_at IS NULL AND p.status = 'active'
       CROSS JOIN (VALUES ('PK'), ('DE')) AS m(market)
       LEFT JOIN inventory i ON i.variant_id = v.id AND i.market = m.market
       WHERE v.active AND (CAST(:market AS text) IS NULL OR m.market = :market)
         AND COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0) <= COALESCE(i.low_stock_threshold, 3)
       ORDER BY COALESCE(i.on_hand, 0) - COALESCE(i.reserved, 0), p.name, v.sku, m.market
       LIMIT :limit`,
      { market, limit },
    );
  },

  recentOrders(
    market: Market | null,
    limit: number,
  ): Promise<RecentOrderRow[]> {
    return selectRows<RecentOrderRow>(
      `SELECT o.number, o.market, o.currency, o.status, o.payment_status, o.total::text AS total,
              o.ship_name, o.email, o.placed_at
       FROM orders o WHERE ${MARKET_FILTER}
       ORDER BY o.placed_at DESC, o.id DESC LIMIT :limit`,
      { market, limit },
    );
  },
};
