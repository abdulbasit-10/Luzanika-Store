import { formatMinor } from "@/features/admin-shell/admin-money";
import type { RegionCode } from "@/types/region";

import type { DashboardData, DashboardMarket } from "./dashboard-service";
import { daysFrom, shortDay } from "./dashboard-period";

export type Tone = "orange" | "blue" | "red" | "green";

export interface StatCardData {
  id: "sales" | "customers" | "refunds" | "revenue";
  label: string;
  /** One line per market for money in "All markets"; a single line otherwise. */
  lines: string[];
  /** The small text under the bar. */
  footer: string;
  /** Against the period right before; null when there is nothing to compare. */
  change: { text: string; up: boolean } | null;
  /** How much of the bar is filled, 0 to 1. */
  progress: number;
  tone: Tone;
}

/** The markets in the answer, always Pakistan first. They are never added together. */
export function marketsOf(
  data: DashboardData | undefined,
): [RegionCode, DashboardMarket][] {
  if (!data) return [];
  return (["PK", "DE"] as const).flatMap((code) => {
    const block = data.markets[code];
    return block ? [[code, block] as [RegionCode, DashboardMarket]] : [];
  });
}

/** "7.5%" and whether it went up. Null when the period before had nothing (no base to compare to) or nothing changed. */
export function percentChange(
  current: number,
  previous: number,
): { text: string; up: boolean } | null {
  if (previous <= 0 || current === previous) return null;
  const percent = ((current - previous) / previous) * 100;
  const rounded =
    Math.abs(percent) >= 100
      ? Math.round(Math.abs(percent))
      : Number(Math.abs(percent).toFixed(1));
  return { text: `${rounded}%`, up: percent > 0 };
}

const sum = (
  data: DashboardData | undefined,
  pick: (market: DashboardMarket) => number,
) => marketsOf(data).reduce((total, [, market]) => total + pick(market), 0);

/** How full the bar is: this period against the larger of the two periods. */
function progress(current: number, previous: number | undefined): number {
  const top = Math.max(current, previous ?? 0);
  return top > 0 ? current / top : 0;
}

/**
 * The four cards on top. Counts of orders, refunds and customers can be added
 * across markets; money cannot, so it is written once per market.
 */
export function statCards(
  current: DashboardData,
  previous: DashboardData | undefined,
): StatCardData[] {
  const markets = marketsOf(current);
  const single = markets.length === 1;

  const paidOrders = sum(current, (m) => m.paid.orders);
  const placed = sum(current, (m) => m.orders.total);
  const refunds = sum(current, (m) => m.refunded.refunds);
  const prevPaidOrders = previous && sum(previous, (m) => m.paid.orders);
  const prevRefunds = previous && sum(previous, (m) => m.refunded.refunds);
  const prevCustomers = previous?.newCustomers;

  const revenueChange =
    single && previous && marketsOf(previous).length === 1
      ? percentChange(markets[0][1].revenue, marketsOf(previous)[0][1].revenue)
      : null;
  const revenueTop = Math.max(
    ...markets.map(([, m]) => m.revenue),
    ...(previous ? marketsOf(previous).map(([, m]) => m.revenue) : [0]),
  );

  return [
    {
      id: "sales",
      label: "Total Sales",
      lines: [String(paidOrders)],
      footer: `${placed} ${placed === 1 ? "order" : "orders"} placed`,
      change:
        prevPaidOrders === undefined
          ? null
          : percentChange(paidOrders, prevPaidOrders),
      progress: progress(paidOrders, prevPaidOrders),
      tone: "orange",
    },
    {
      id: "customers",
      label: "New Customer",
      lines: [String(current.newCustomers)],
      footer: `in ${current.period.days} days`,
      change:
        prevCustomers === undefined
          ? null
          : percentChange(current.newCustomers, prevCustomers),
      progress: progress(current.newCustomers, prevCustomers),
      tone: "blue",
    },
    {
      id: "refunds",
      label: "Refunds",
      lines: [String(refunds)],
      footer:
        markets
          .map(([, m]) => formatMinor(m.refunded.amount, m.currency))
          .join(" · ") || "none",
      change:
        prevRefunds === undefined ? null : percentChange(refunds, prevRefunds),
      progress: progress(refunds, prevRefunds),
      tone: "red",
    },
    {
      id: "revenue",
      label: "Total Revenue",
      lines: markets.map(([, m]) =>
        formatMinor(m.revenue, m.currency, { alwaysCents: true }),
      ),
      footer: single
        ? `${markets[0][1].paid.orders} paid ${markets[0][1].paid.orders === 1 ? "order" : "orders"}`
        : "each market in its own currency",
      change: revenueChange,
      progress: single
        ? revenueTop > 0
          ? markets[0][1].revenue / revenueTop
          : 0
        : 1,
      tone: "green",
    },
  ];
}

export type Grouping = "day" | "week";

export interface ChartPoint {
  /** Under the bar and in the tooltip, e.g. "Nov 3". */
  label: string;
  /** Minor units of the market's currency. */
  income: number;
}

/** Bars of revenue for one market, one per day or per week, with empty days as zero. */
export function chartPoints(
  market: DashboardMarket,
  period: DashboardData["period"],
  grouping: Grouping,
): ChartPoint[] {
  const byDay = new Map(market.series.map((day) => [day.date, day.revenue]));
  const days = daysFrom(period.from.slice(0, 10), period.days);
  const step = grouping === "week" ? 7 : 1;
  const points: ChartPoint[] = [];
  for (let i = 0; i < days.length; i += step) {
    const slice = days.slice(i, i + step);
    points.push({
      label:
        slice.length > 1
          ? `${shortDay(slice[0], false)} – ${shortDay(slice[slice.length - 1], false)}`
          : shortDay(slice[0], false),
      income: slice.reduce((total, day) => total + (byDay.get(day) ?? 0), 0),
    });
  }
  return points;
}

const NICE = [1, 2, 2.5, 5, 10];

/** The axis has `intervals` equal gaps; the gap is a round number (1, 2, 2.5 or 5 × 10^n) that holds the tallest bar. In major units. */
export function niceAxis(
  maxMinor: number,
  intervals = 3,
): { step: number; max: number } {
  // Never finer than 1 per gap, so an empty period still reads 0, 1, 2, 3.
  const wanted = Math.max(maxMinor / 100 / intervals, 1);
  const power = 10 ** Math.floor(Math.log10(wanted));
  const step = (NICE.find((n) => n * power >= wanted) ?? 10) * power;
  return { step, max: step * intervals };
}

export interface IncomeShare {
  currency: DashboardMarket["currency"];
  /** The share of what customers paid that was kept after refunds, 0 to 100. */
  percent: number;
  paid: number;
  refunded: number;
}

export function incomeShare(market: DashboardMarket): IncomeShare {
  const { amount: paid } = market.paid;
  return {
    currency: market.currency,
    percent:
      paid > 0
        ? Math.max(0, Math.min(100, Math.round((market.revenue / paid) * 100)))
        : 0,
    paid,
    refunded: market.refunded.amount,
  };
}
