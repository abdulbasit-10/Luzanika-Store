import "server-only";

import { daysOf, resolvePeriod } from "@/server/admin/dashboard-period";
import {
  adminDashboardRepository,
  type DayAmount,
  type Period,
} from "@/server/repositories/admin-dashboard-repository";
import type { Market } from "@/server/repositories/order-repository";
import type { DashboardQuery } from "@/server/validation/admin-dashboard-schemas";

const MARKETS: Market[] = ["PK", "DE"];
const CURRENCY: Record<Market, "PKR" | "EUR"> = { PK: "PKR", DE: "EUR" };
const STATUSES = [
  "waiting_payment",
  "processing",
  "in_delivery",
  "completed",
  "cancelled",
  "refunded",
] as const;
const LOW_STOCK_LIMIT = 20;
const RECENT_ORDERS = 10;

export interface MarketSummary {
  currency: "PKR" | "EUR";
  /** Orders placed in the period. */
  orders: {
    total: number;
    byStatus: Record<(typeof STATUSES)[number], number>;
  };
  /** Orders paid in the period and their value, minor units. */
  paid: { orders: number; amount: number };
  /** Refunds made in the period, minor units. */
  refunded: { refunds: number; amount: number };
  /** Paid minus refunded. */
  revenue: number;
  /** Right now, not limited to the period. */
  waitingPayment: number;
  /** Right now: paid and waiting to be shipped. */
  awaitingShipment: number;
  /** One entry per UTC day of the period. */
  series: {
    date: string;
    orders: number;
    paidAmount: number;
    refundedAmount: number;
    revenue: number;
  }[];
}

function perDay(rows: DayAmount[], market: Market) {
  const map = new Map<string, DayAmount>();
  for (const row of rows) if (row.market === market) map.set(row.day, row);
  return map;
}

/**
 * The numbers for the admin dashboard. PKR and EUR are never added together
 * (there is no exchange rate): every figure is per market.
 */
export async function getDashboard(query: DashboardQuery, now = new Date()) {
  const range = resolvePeriod(query, now);
  const period: Period = { ...range, market: query.market ?? null };
  const markets = query.market ? [query.market] : MARKETS;

  const [
    byStatus,
    paid,
    refunded,
    backlog,
    newCustomers,
    orderDays,
    paidDays,
    refundedDays,
    lowStock,
    recent,
  ] = await Promise.all([
    adminDashboardRepository.ordersByStatus(period),
    adminDashboardRepository.paid(period),
    adminDashboardRepository.refunded(period),
    adminDashboardRepository.currentBacklog(period.market),
    adminDashboardRepository.newCustomers(period),
    adminDashboardRepository.ordersPerDay(period),
    adminDashboardRepository.paidPerDay(period),
    adminDashboardRepository.refundedPerDay(period),
    adminDashboardRepository.lowStock(period.market, LOW_STOCK_LIMIT),
    adminDashboardRepository.recentOrders(period.market, RECENT_ORDERS),
  ]);

  const days = daysOf(range);
  const summaries: Partial<Record<Market, MarketSummary>> = {};

  for (const market of markets) {
    const statusCounts = Object.fromEntries(
      STATUSES.map((status) => [status, 0]),
    ) as MarketSummary["orders"]["byStatus"];
    for (const row of byStatus.filter((item) => item.market === market)) {
      statusCounts[row.status as keyof typeof statusCounts] = row.n;
    }
    const paidRow = paid.find((row) => row.market === market);
    const refundedRow = refunded.find((row) => row.market === market);
    const ordersByDay = perDay(orderDays, market);
    const paidByDay = perDay(paidDays, market);
    const refundedByDay = perDay(refundedDays, market);

    summaries[market] = {
      currency: CURRENCY[market],
      orders: {
        total: Object.values(statusCounts).reduce((sum, n) => sum + n, 0),
        byStatus: statusCounts,
      },
      paid: { orders: paidRow?.n ?? 0, amount: paidRow?.amount ?? 0 },
      refunded: {
        refunds: refundedRow?.n ?? 0,
        amount: refundedRow?.amount ?? 0,
      },
      revenue: (paidRow?.amount ?? 0) - (refundedRow?.amount ?? 0),
      waitingPayment:
        backlog.find(
          (row) => row.market === market && row.status === "waiting_payment",
        )?.n ?? 0,
      awaitingShipment:
        backlog.find(
          (row) => row.market === market && row.status === "processing",
        )?.n ?? 0,
      series: days.map((date) => {
        const paidAmount = paidByDay.get(date)?.amount ?? 0;
        const refundedAmount = refundedByDay.get(date)?.amount ?? 0;
        return {
          date,
          orders: ordersByDay.get(date)?.n ?? 0,
          paidAmount,
          refundedAmount,
          revenue: paidAmount - refundedAmount,
        };
      }),
    };
  }

  return {
    period: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      days: days.length,
    },
    markets: summaries,
    newCustomers,
    lowStock: lowStock.map((row) => ({
      variantId: row.variant_id,
      productId: row.product_id,
      productName: row.product_name,
      sku: row.sku,
      color: row.color_name,
      size: row.size_label,
      market: row.market,
      onHand: row.on_hand,
      reserved: row.reserved,
      available: row.on_hand - row.reserved,
      lowStockThreshold: row.low_stock_threshold,
    })),
    recentOrders: recent.map((row) => ({
      number: row.number,
      market: row.market,
      currency: row.currency,
      status: row.status,
      paymentStatus: row.payment_status,
      total: Number(row.total),
      recipient: row.ship_name,
      email: row.email,
      placedAt: new Date(row.placed_at).toISOString(),
    })),
  };
}
