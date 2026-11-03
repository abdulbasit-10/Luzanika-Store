import { describe, expect, it } from "vitest";

import type { DashboardData, DashboardMarket } from "./dashboard-service";
import {
  chartPoints,
  incomeShare,
  niceAxis,
  percentChange,
  statCards,
} from "./dashboard-stats";

const zeroStatus = {
  waiting_payment: 0,
  processing: 0,
  in_delivery: 0,
  completed: 0,
  cancelled: 0,
  refunded: 0,
};

const market = (
  currency: "PKR" | "EUR",
  over: Partial<DashboardMarket> = {},
): DashboardMarket => ({
  currency,
  orders: { total: 4, byStatus: zeroStatus },
  paid: { orders: 2, amount: 520000 },
  refunded: { refunds: 1, amount: 10000 },
  revenue: 510000,
  waitingPayment: 1,
  awaitingShipment: 1,
  series: [
    {
      date: "2026-11-02",
      orders: 2,
      paidAmount: 520000,
      refundedAmount: 10000,
      revenue: 510000,
    },
  ],
  ...over,
});

const data = (
  markets: DashboardData["markets"],
  customers = 4,
): DashboardData => ({
  period: { from: "2026-11-01", to: "2026-11-07", days: 7 },
  markets,
  newCustomers: customers,
  recentOrders: [],
});

describe("percentChange", () => {
  it("is the change against the period before", () => {
    expect(percentChange(110, 100)).toEqual({ text: "10%", up: true });
    expect(percentChange(75, 100)).toEqual({ text: "25%", up: false });
    expect(percentChange(1075, 100)).toEqual({ text: "975%", up: true });
  });

  it("has nothing to say without a base or a change", () => {
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(5, 5)).toBeNull();
  });
});

describe("statCards", () => {
  it("writes the money of each market in its own currency, never added", () => {
    const cards = statCards(
      data({ PK: market("PKR"), DE: market("EUR", { revenue: 4500 }) }),
      undefined,
    );
    const revenue = cards.find((card) => card.id === "revenue");
    expect(revenue?.lines).toEqual(["PKR 5,100.00", "EUR 45.00"]);
    expect(revenue?.change).toBeNull();
  });

  it("adds counts across markets", () => {
    const cards = statCards(
      data({ PK: market("PKR"), DE: market("EUR") }),
      undefined,
    );
    expect(cards.find((c) => c.id === "sales")?.lines).toEqual(["4"]);
    expect(cards.find((c) => c.id === "refunds")?.lines).toEqual(["2"]);
  });

  it("compares one market's revenue with the period before", () => {
    const now = data({ PK: market("PKR", { revenue: 110000 }) });
    const before = data({ PK: market("PKR", { revenue: 100000 }) });
    const revenue = statCards(now, before).find((c) => c.id === "revenue");
    expect(revenue?.lines).toEqual(["PKR 1,100.00"]);
    expect(revenue?.change).toEqual({ text: "10%", up: true });
  });
});

describe("chartPoints", () => {
  const period = { from: "2026-11-01", to: "2026-11-07", days: 7 };

  it("has one bar per day, empty days as zero", () => {
    const points = chartPoints(market("PKR"), period, "day");
    expect(points).toHaveLength(7);
    expect(points[1]).toEqual({ label: "Nov 2", income: 510000 });
    expect(points[0].income).toBe(0);
  });

  it("groups by week", () => {
    const points = chartPoints(market("PKR"), period, "week");
    expect(points).toEqual([{ label: "Nov 1 – Nov 7", income: 510000 }]);
  });
});

describe("niceAxis", () => {
  it("picks a round gap that holds the tallest bar", () => {
    expect(niceAxis(1_440_000)).toEqual({ step: 5000, max: 15000 });
    expect(niceAxis(410_000)).toEqual({ step: 2000, max: 6000 });
    expect(niceAxis(0)).toEqual({ step: 1, max: 3 });
  });
});

describe("incomeShare", () => {
  it("is the share of the payments kept after refunds", () => {
    expect(incomeShare(market("EUR"))).toMatchObject({
      currency: "EUR",
      percent: 98,
      paid: 520000,
      refunded: 10000,
    });
  });

  it("is zero when nothing was paid", () => {
    expect(
      incomeShare(market("PKR", { paid: { orders: 0, amount: 0 }, revenue: 0 }))
        .percent,
    ).toBe(0);
  });
});
