import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { GET as dashboardRoute } from "@/app/api/v1/admin/dashboard/route";
import { POST as refundRoute } from "@/app/api/v1/admin/orders/[number]/refunds/route";
import { setEmailSender } from "@/server/email/email-sender";

import { signedInStaff } from "./admin-helpers";
import { call, exec } from "./helpers";
import {
  importCatalog,
  payOrder,
  placeTestOrder,
  resetShopData,
  signUpCustomer,
  variantOf,
} from "./shop-helpers";

beforeAll(importCatalog);

beforeEach(async () => {
  await resetShopData();
  setEmailSender({ send: async () => {} });
});
afterEach(() => setEmailSender(undefined));

const dashboard = (staffCookie: string | undefined, query = "") =>
  call(dashboardRoute, {
    method: "GET",
    staffCookie,
    path: `/api/v1/admin/dashboard${query}`,
  });
const viewer = () => signedInStaff({ permissions: ["dashboard.view"] });

describe("who may see the dashboard", () => {
  it("needs a signed-in staff member with the dashboard permission", async () => {
    expect((await dashboard(undefined)).status).toBe(401);
    const other = await signedInStaff({ permissions: ["orders.view"] });
    expect((await dashboard(other.cookie)).status).toBe(403);
    expect((await dashboard((await viewer()).cookie)).status).toBe(200);
  });
});

describe("an empty shop", () => {
  it("shows zeros for both markets, one entry per day, and each market's own currency", async () => {
    const staff = await viewer();
    const result = await dashboard(staff.cookie);

    expect(result.status).toBe(200);
    expect(result.body.period.days).toBe(30);
    expect(Object.keys(result.body.markets).sort()).toEqual(["DE", "PK"]);
    expect(result.body.markets.PK.currency).toBe("PKR");
    expect(result.body.markets.DE.currency).toBe("EUR");
    for (const market of ["PK", "DE"]) {
      const summary = result.body.markets[market];
      expect(summary).toMatchObject({
        orders: {
          total: 0,
          byStatus: {
            waiting_payment: 0,
            processing: 0,
            in_delivery: 0,
            completed: 0,
            cancelled: 0,
            refunded: 0,
          },
        },
        paid: { orders: 0, amount: 0 },
        refunded: { refunds: 0, amount: 0 },
        revenue: 0,
        waitingPayment: 0,
        awaitingShipment: 0,
      });
      expect(summary.series).toHaveLength(30);
    }
    expect(result.body.recentOrders).toEqual([]);
  });
});

describe("with orders", () => {
  it("counts orders, paid money and refunds per market and never adds the two currencies", async () => {
    const staff = await signedInStaff({
      permissions: ["dashboard.view", "orders.view", "orders.refund"],
    });

    const paidPk = await placeTestOrder({ market: "PK" });
    await payOrder(paidPk.customer, paidPk.number);
    const waitingPk = await placeTestOrder({ market: "PK", size: "M" });
    const paidDe = await placeTestOrder({ market: "DE", size: "L" });
    await payOrder(paidDe.customer, paidDe.number);

    const refunded = await call(refundRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { number: paidPk.number },
      body: { amount: 10_000, reason: "Late delivery" },
    });
    expect(refunded.status).toBe(201);

    const { body } = await dashboard(staff.cookie);
    const pk = body.markets.PK;
    const de = body.markets.DE;

    expect(pk.orders.total).toBe(2);
    expect(pk.orders.byStatus).toMatchObject({
      processing: 1,
      waiting_payment: 1,
    });
    expect(pk.paid).toEqual({ orders: 1, amount: paidPk.total });
    expect(pk.refunded).toEqual({ refunds: 1, amount: 10_000 });
    expect(pk.revenue).toBe(paidPk.total - 10_000);
    expect(pk.waitingPayment).toBe(1);
    expect(pk.awaitingShipment).toBe(1);

    expect(de.orders.total).toBe(1);
    expect(de.paid).toEqual({ orders: 1, amount: paidDe.total });
    expect(de.refunded).toEqual({ refunds: 0, amount: 0 });
    expect(de.revenue).toBe(paidDe.total);

    // Today is the last day of the series and carries today's money.
    const today = pk.series[pk.series.length - 1];
    expect(today).toMatchObject({
      date: new Date().toISOString().slice(0, 10),
      orders: 2,
      paidAmount: paidPk.total,
      refundedAmount: 10_000,
      revenue: paidPk.total - 10_000,
    });
    expect(
      pk.series
        .slice(0, -1)
        .every((day: { orders: number }) => day.orders === 0),
    ).toBe(true);

    expect(
      body.recentOrders.map((order: { number: string }) => order.number),
    ).toEqual([paidDe.number, waitingPk.number, paidPk.number]);
    expect(body.recentOrders[0]).toMatchObject({
      market: "DE",
      currency: "EUR",
      status: "processing",
      total: paidDe.total,
    });
    expect(waitingPk.total).toBeGreaterThan(0);
  });

  it("limits everything to one market when asked", async () => {
    const staff = await viewer();
    const pk = await placeTestOrder({ market: "PK" });
    await payOrder(pk.customer, pk.number);
    await placeTestOrder({ market: "DE", size: "M" });

    const { body } = await dashboard(staff.cookie, "?market=DE");
    expect(Object.keys(body.markets)).toEqual(["DE"]);
    expect(body.markets.DE.orders.total).toBe(1);
    expect(
      body.recentOrders.every(
        (order: { market: string }) => order.market === "DE",
      ),
    ).toBe(true);
  });

  it("looks at the period asked for, and an order outside it does not count", async () => {
    const staff = await viewer();
    const order = await placeTestOrder({ market: "PK" });
    await payOrder(order.customer, order.number);
    await exec(
      "UPDATE orders SET placed_at = now() - interval '40 days', paid_at = now() - interval '40 days' WHERE number = :number",
      { number: order.number },
    );

    const recent = await dashboard(staff.cookie);
    expect(recent.body.markets.PK.orders.total).toBe(0);
    expect(recent.body.markets.PK.paid.amount).toBe(0);

    const day = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const old = await dashboard(staff.cookie, `?from=${day}&to=${day}`);
    expect(old.status).toBe(200);
    expect(old.body.period.days).toBe(1);
    expect(old.body.markets.PK.orders.total).toBe(1);
    expect(old.body.markets.PK.paid.amount).toBe(order.total);
    expect(old.body.markets.PK.series).toHaveLength(1);
    expect(old.body.markets.PK.series[0]).toMatchObject({
      date: day,
      paidAmount: order.total,
    });
  });

  it("lists only the ten newest orders", async () => {
    const staff = await viewer();
    const customer = await signUpCustomer();
    for (let n = 0; n < 11; n++) {
      await placeTestOrder({ customer, size: n % 2 ? "S" : "M" });
    }
    const { body } = await dashboard(staff.cookie);
    expect(body.recentOrders).toHaveLength(10);
    expect(body.markets.PK.orders.total).toBe(11);
  });
});

describe("customers and stock", () => {
  it("counts the customers who signed up in the period", async () => {
    const staff = await viewer();
    const before = (await dashboard(staff.cookie)).body.newCustomers as number;
    await signUpCustomer();
    await signUpCustomer();
    expect((await dashboard(staff.cookie)).body.newCustomers).toBe(before + 2);
  });

  it("lists what is low on stock, the lowest first, and nothing that is well stocked", async () => {
    const staff = await viewer();
    const low = await variantOf("S");
    const lower = await variantOf("M");
    await exec(
      "UPDATE inventory SET on_hand = 2, reserved = 0 WHERE variant_id = :id AND market = 'PK'",
      { id: low },
    );
    await exec(
      "UPDATE inventory SET on_hand = 5, reserved = 4, low_stock_threshold = 3 WHERE variant_id = :id AND market = 'DE'",
      { id: lower },
    );

    const { body } = await dashboard(staff.cookie);
    const ours = body.lowStock.filter(
      (row: { variantId: string }) =>
        row.variantId === low || row.variantId === lower,
    );
    expect(ours).toHaveLength(2);
    // The one with 1 left comes before the one with 2 left.
    expect(ours[0]).toMatchObject({
      variantId: lower,
      market: "DE",
      available: 1,
    });
    expect(ours[1]).toMatchObject({
      variantId: low,
      market: "PK",
      available: 2,
    });
    expect(
      body.lowStock.map((row: { available: number }) => row.available),
    ).toEqual(
      [
        ...body.lowStock.map((row: { available: number }) => row.available),
      ].sort((a: number, b: number) => a - b),
    );
    expect(
      body.lowStock.every(
        (row: { available: number; lowStockThreshold: number }) =>
          row.available <= row.lowStockThreshold,
      ),
    ).toBe(true);

    const onlyDe = await dashboard(staff.cookie, "?market=DE");
    expect(
      onlyDe.body.lowStock.every(
        (row: { market: string }) => row.market === "DE",
      ),
    ).toBe(true);
  });
});

describe("a period that makes no sense", () => {
  it("is refused with a message, not answered with nonsense", async () => {
    const staff = await viewer();
    const bad = [
      "?from=2026-11-05&to=2026-11-01",
      "?from=2026-11-01&to=2026-11-01T00:00:00Z",
      "?from=2024-01-01&to=2026-01-01",
      "?from=yesterday",
      "?to=2026-13-45",
      "?market=FR",
    ];
    for (const query of bad) {
      const result = await dashboard(staff.cookie, query);
      expect(result.status, query).toBe(400);
      expect(result.body.error.code).toBe("validation_failed");
    }
  });
});
