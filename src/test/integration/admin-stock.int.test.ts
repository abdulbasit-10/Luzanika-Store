import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { GET as listRoute } from "@/app/api/v1/admin/stock/route";
import { POST as adjustRoute } from "@/app/api/v1/admin/stock/adjustments/route";
import { PATCH as thresholdRoute } from "@/app/api/v1/admin/stock/low-stock-threshold/route";
import { GET as movementsRoute } from "@/app/api/v1/admin/stock/movements/route";
import { GET as productRoute } from "@/app/api/v1/products/[slug]/route";

import { signedInStaff } from "./admin-helpers";
import { call, exec, sql } from "./helpers";
import {
  DRESS,
  importCatalog,
  payOrder,
  placeTestOrder,
  resetShopData,
  stockOf,
  variantOf,
} from "./shop-helpers";

beforeAll(importCatalog);

beforeEach(async () => {
  await resetShopData();
  // Some tests delete a stock record: put every variant back in both markets.
  await exec(
    `INSERT INTO inventory (variant_id, market, on_hand)
     SELECT v.id, m.market, 25 FROM product_variants v CROSS JOIN (VALUES ('PK'), ('DE')) AS m(market)
     ON CONFLICT (variant_id, market) DO NOTHING`,
  );
  await exec("UPDATE inventory SET low_stock_threshold = 3");
  await exec(
    "DELETE FROM stock_movements WHERE reason IN ('adjustment', 'correction')",
  );
});

const list = (staffCookie: string | undefined, query = "") =>
  call(listRoute, {
    method: "GET",
    staffCookie,
    path: `/api/v1/admin/stock${query}`,
  });
const movements = (staffCookie: string | undefined, query = "") =>
  call(movementsRoute, {
    method: "GET",
    staffCookie,
    path: `/api/v1/admin/stock/movements${query}`,
  });
const adjust = (staffCookie: string | undefined, body: unknown) =>
  call(adjustRoute, { method: "POST", staffCookie, body });
const threshold = (staffCookie: string | undefined, body: unknown) =>
  call(thresholdRoute, { method: "PATCH", staffCookie, body });

const viewer = () => signedInStaff({ permissions: ["stock.view"] });
const keeper = () =>
  signedInStaff({ permissions: ["stock.view", "stock.adjust"] });

describe("who may see and change stock", () => {
  it("needs a signed-in staff member", async () => {
    const variantId = await variantOf("S");
    const results = await Promise.all([
      list(undefined),
      movements(undefined),
      adjust(undefined, { variantId, market: "PK", delta: 1 }),
      threshold(undefined, { variantId, market: "PK", lowStockThreshold: 5 }),
    ]);
    for (const result of results) expect(result.status).toBe(401);
  });

  it("lets viewing and changing be given separately", async () => {
    const variantId = await variantOf("S");
    const seeOnly = await viewer();
    const changeOnly = await signedInStaff({ permissions: ["stock.adjust"] });
    const body = { variantId, market: "PK", delta: 1 };

    expect((await list(seeOnly.cookie)).status).toBe(200);
    expect((await movements(seeOnly.cookie)).status).toBe(200);
    const refused = await adjust(seeOnly.cookie, body);
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe("forbidden");
    expect(
      (
        await threshold(seeOnly.cookie, {
          variantId,
          market: "PK",
          lowStockThreshold: 5,
        })
      ).status,
    ).toBe(403);

    expect((await adjust(changeOnly.cookie, body)).status).toBe(201);
    expect((await list(changeOnly.cookie)).status).toBe(403);
    expect((await movements(changeOnly.cookie)).status).toBe(403);
  });
});

describe("the stock list", () => {
  it("shows every variant in both markets with what is on the shelf and what can be sold", async () => {
    const staff = await viewer();
    const [{ n: variants }] = await sql<{ n: string }>(
      "SELECT count(*) AS n FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.deleted_at IS NULL",
    );

    const result = await list(staff.cookie, "?pageSize=100");

    expect(result.status).toBe(200);
    expect(result.body.total).toBe(Number(variants) * 2);
    expect(result.body.items[0]).toMatchObject({
      onHand: 25,
      reserved: 0,
      available: 25,
      lowStockThreshold: 3,
      low: false,
      hasRecord: true,
      variantActive: true,
    });
    const markets = new Set(
      result.body.items.map((item: { market: string }) => item.market),
    );
    expect(markets).toEqual(new Set(["PK", "DE"]));
  });

  it("separates what is held for unpaid orders from what can be sold", async () => {
    const order = await placeTestOrder({ quantity: 2 });
    const staff = await viewer();

    const result = await list(
      staff.cookie,
      `?market=PK&search=${DRESS.slice(0, 7)}&pageSize=100`,
    );
    const row = result.body.items.find(
      (item: { variantId: string }) => item.variantId === order.variantId,
    );

    expect(row).toMatchObject({
      onHand: 25,
      reserved: 2,
      available: 23,
      low: false,
    });
  });

  it("filters by market, product, search text and low stock, and pages", async () => {
    const staff = await viewer();
    const variantId = await variantOf("S");
    const [{ product_id: productId }] = await sql<{ product_id: string }>(
      "SELECT product_id FROM product_variants WHERE id = :variantId",
      { variantId },
    );

    const de = await list(staff.cookie, "?market=DE&pageSize=100");
    expect(
      de.body.items.every((item: { market: string }) => item.market === "DE"),
    ).toBe(true);

    const product = await list(
      staff.cookie,
      `?productId=${productId}&pageSize=100`,
    );
    expect(product.body.items.length).toBeGreaterThan(0);
    expect(
      product.body.items.every(
        (item: { productId: string }) => item.productId === productId,
      ),
    ).toBe(true);

    const bySku = await list(
      staff.cookie,
      `?search=${encodeURIComponent((await sql<{ sku: string }>("SELECT sku FROM product_variants WHERE id = :variantId", { variantId }))[0].sku)}`,
    );
    expect(
      bySku.body.items.map((item: { variantId: string }) => item.variantId),
    ).toEqual([variantId, variantId]);

    expect((await list(staff.cookie, "?search=%25")).body.total).toBe(0);
    expect((await list(staff.cookie, "?search=zzzz-nothing")).body.total).toBe(
      0,
    );

    const paged = await list(staff.cookie, "?pageSize=3&page=2");
    expect(paged.body).toMatchObject({ page: 2, pageSize: 3 });
    expect(paged.body.items).toHaveLength(3);
  });

  it("flags what is low, and counts a variant with no record as zero", async () => {
    const staff = await viewer();
    const variantId = await variantOf("S");
    await exec(
      "UPDATE inventory SET on_hand = 3 WHERE variant_id = :variantId AND market = 'PK'",
      { variantId },
    );
    await exec(
      "DELETE FROM inventory WHERE variant_id = :variantId AND market = 'DE'",
      { variantId },
    );

    const low = await list(staff.cookie, "?lowOnly=true&pageSize=100");
    const rows = low.body.items.filter(
      (item: { variantId: string }) => item.variantId === variantId,
    );

    expect(rows).toHaveLength(2);
    expect(
      rows.find((row: { market: string }) => row.market === "PK"),
    ).toMatchObject({ onHand: 3, low: true, hasRecord: true });
    expect(
      rows.find((row: { market: string }) => row.market === "DE"),
    ).toMatchObject({ onHand: 0, available: 0, low: true, hasRecord: false });
    expect(low.body.total).toBe(2);
  });

  it("refuses filters that make no sense", async () => {
    const staff = await viewer();

    for (const query of [
      "?market=FR",
      "?productId=nope",
      "?lowOnly=maybe",
      "?pageSize=0",
      "?pageSize=101",
    ]) {
      expect((await list(staff.cookie, query)).status, query).toBe(400);
    }
  });
});

describe("changing the stock", () => {
  it("adds units, writes the ledger with who and why, and shows the new level", async () => {
    const staff = await keeper();
    const variantId = await variantOf("S");

    const result = await adjust(staff.cookie, {
      variantId,
      market: "PK",
      delta: 5,
      note: "Delivery from the factory",
    });

    expect(result.status).toBe(201);
    expect(result.body.stock).toMatchObject({
      variantId,
      market: "PK",
      onHand: 30,
      available: 30,
    });
    const [movement] = await sql<{
      delta: number;
      reason: string;
      note: string;
      staff_id: string;
    }>(
      "SELECT delta, reason, note, staff_id FROM stock_movements WHERE variant_id = :variantId AND reason = 'adjustment'",
      { variantId },
    );
    expect(movement).toEqual({
      delta: 5,
      reason: "adjustment",
      note: "Delivery from the factory",
      staff_id: staff.id,
    });
    // The other market is not touched.
    expect(await stockOf(variantId, "DE")).toEqual({
      on_hand: 25,
      reserved: 0,
    });
  });

  it("removes units, and sets an exact level", async () => {
    const staff = await keeper();
    const variantId = await variantOf("S");

    expect(
      (await adjust(staff.cookie, { variantId, market: "PK", delta: -10 })).body
        .stock.onHand,
    ).toBe(15);
    const set = await adjust(staff.cookie, {
      variantId,
      market: "PK",
      setTo: 40,
      reason: "correction",
      note: "Recounted the shelf",
    });

    expect(set.body.stock.onHand).toBe(40);
    const rows = await sql<{ delta: number; reason: string }>(
      "SELECT delta, reason FROM stock_movements WHERE variant_id = :variantId AND reason IN ('adjustment', 'correction') ORDER BY id",
      { variantId },
    );
    expect(rows).toEqual([
      { delta: -10, reason: "adjustment" },
      { delta: 25, reason: "correction" },
    ]);
  });

  it("refuses a change that changes nothing, or takes the shelf below zero", async () => {
    const staff = await keeper();
    const variantId = await variantOf("S");

    const same = await adjust(staff.cookie, {
      variantId,
      market: "PK",
      setTo: 25,
    });
    expect(same.status).toBe(400);
    expect(same.body.error.message).toContain("already");

    const tooMany = await adjust(staff.cookie, {
      variantId,
      market: "PK",
      delta: -26,
    });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.error.fields.delta).toContain("25");
    expect(await stockOf(variantId)).toEqual({ on_hand: 25, reserved: 0 });
    const [{ n }] = await sql<{ n: string }>(
      "SELECT count(*) AS n FROM stock_movements WHERE reason = 'adjustment'",
    );
    expect(Number(n)).toBe(0);
  });

  it("never takes stock below what unpaid orders are holding", async () => {
    const order = await placeTestOrder({ quantity: 2 });
    const staff = await keeper();
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 25,
      reserved: 2,
    });

    const refused = await adjust(staff.cookie, {
      variantId: order.variantId,
      market: "PK",
      setTo: 1,
    });
    expect(refused.status).toBe(409);
    expect(refused.body.error.message).toContain("2 are held");

    // Down to exactly what is held is fine: nothing more can be sold, but the order can still be paid.
    const ok = await adjust(staff.cookie, {
      variantId: order.variantId,
      market: "PK",
      setTo: 2,
    });
    expect(ok.body.stock).toMatchObject({
      onHand: 2,
      reserved: 2,
      available: 0,
      low: true,
    });
    await payOrder(order.customer, order.number);
    expect(await stockOf(order.variantId)).toEqual({ on_hand: 0, reserved: 0 });
  });

  it("creates the stock record when the variant has none in that market", async () => {
    const staff = await keeper();
    const variantId = await variantOf("S");
    await exec(
      "DELETE FROM inventory WHERE variant_id = :variantId AND market = 'DE'",
      { variantId },
    );

    const removing = await adjust(staff.cookie, {
      variantId,
      market: "DE",
      delta: -5,
    });
    expect(removing.status).toBe(400);

    const adding = await adjust(staff.cookie, {
      variantId,
      market: "DE",
      delta: 10,
    });
    expect(adding.status).toBe(201);
    expect(adding.body.stock).toMatchObject({ onHand: 10, hasRecord: true });
    expect(await stockOf(variantId, "DE")).toEqual({
      on_hand: 10,
      reserved: 0,
    });
  });

  it("a correction must say what was wrong", async () => {
    const staff = await keeper();
    const variantId = await variantOf("S");

    const result = await adjust(staff.cookie, {
      variantId,
      market: "PK",
      delta: 1,
      reason: "correction",
    });

    expect(result.status).toBe(400);
    expect(result.body.error.fields.note).toBeTruthy();
  });

  it("refuses bad input and fields it does not know", async () => {
    const staff = await keeper();
    const variantId = await variantOf("S");
    const bad: Record<string, unknown>[] = [
      {},
      { variantId, market: "PK" },
      { variantId, market: "PK", delta: 1, setTo: 5 },
      { variantId, market: "PK", delta: 0 },
      { variantId, market: "PK", delta: 1.5 },
      { variantId, market: "PK", delta: "5" },
      { variantId, market: "PK", setTo: -1 },
      { variantId, market: "PK", delta: 2_000_000 },
      { variantId, market: "FR", delta: 1 },
      { variantId: "nope", market: "PK", delta: 1 },
      { variantId, market: "PK", delta: 1, reason: "sale" },
      { variantId, market: "PK", delta: 1, note: "x".repeat(201) },
      { variantId, market: "PK", delta: 1, extra: true },
    ];

    for (const body of bad) {
      expect(
        (await adjust(staff.cookie, body)).status,
        JSON.stringify(body),
      ).toBe(400);
    }
    expect(await stockOf(variantId)).toEqual({ on_hand: 25, reserved: 0 });
  });

  it("not found for a variant that does not exist", async () => {
    const staff = await keeper();

    const result = await adjust(staff.cookie, {
      variantId: crypto.randomUUID(),
      market: "PK",
      delta: 1,
    });

    expect(result.status).toBe(404);
  });

  it("many changes at the same moment add up exactly", async () => {
    const a = await keeper();
    const b = await keeper();
    const variantId = await variantOf("S");

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        adjust((i % 2 ? a : b).cookie, { variantId, market: "PK", delta: 1 }),
      ),
    );

    expect(results.every((result) => result.status === 201)).toBe(true);
    expect(await stockOf(variantId)).toEqual({ on_hand: 35, reserved: 0 });
    const [{ n, total }] = await sql<{ n: string; total: string }>(
      "SELECT count(*) AS n, sum(delta) AS total FROM stock_movements WHERE variant_id = :variantId AND reason = 'adjustment'",
      { variantId },
    );
    expect({ n: Number(n), total: Number(total) }).toEqual({
      n: 10,
      total: 10,
    });
  });

  it("records the change in the audit log, with before and after", async () => {
    const staff = await keeper();
    const variantId = await variantOf("S");
    await adjust(staff.cookie, {
      variantId,
      market: "PK",
      delta: 5,
      note: "Delivery",
    });

    const [row] = await sql<{
      staff_email: string;
      before: Record<string, number>;
      after: Record<string, unknown>;
    }>(
      "SELECT staff_email, before, after FROM audit_log WHERE action = 'stock.adjust' AND entity_id = :id ORDER BY id DESC LIMIT 1",
      { id: `${variantId}:PK` },
    );
    expect(row.staff_email).toBe(staff.email);
    expect(row.before).toEqual({ onHand: 25, reserved: 0 });
    expect(row.after).toMatchObject({
      onHand: 30,
      delta: 5,
      reason: "adjustment",
      note: "Delivery",
    });
  });

  it("shows on the shop's product page", async () => {
    const staff = await keeper();
    const variantId = await variantOf("S");
    await adjust(staff.cookie, { variantId, market: "PK", setTo: 7 });

    const page = await call(productRoute, {
      method: "GET",
      params: { slug: DRESS },
      path: `/api/v1/products/${DRESS}`,
    });

    const variant = (page.body.product ?? page.body).variants.find(
      (item: { id: string }) => item.id === variantId,
    );
    expect(variant.stock).toEqual({ PK: 7, DE: 25 });
  });
});

describe("the low-stock threshold", () => {
  it("decides when a variant counts as low", async () => {
    const staff = await keeper();
    const variantId = await variantOf("S");
    await adjust(staff.cookie, { variantId, market: "PK", setTo: 8 });

    const before = await threshold(staff.cookie, {
      variantId,
      market: "PK",
      lowStockThreshold: 5,
    });
    expect(before.body.stock).toMatchObject({
      lowStockThreshold: 5,
      low: false,
    });

    const after = await threshold(staff.cookie, {
      variantId,
      market: "PK",
      lowStockThreshold: 8,
    });
    expect(after.body.stock).toMatchObject({ lowStockThreshold: 8, low: true });
    const [audit] = await sql<{ before: unknown; after: unknown }>(
      "SELECT before, after FROM audit_log WHERE action = 'stock.threshold' ORDER BY id DESC LIMIT 1",
    );
    expect(audit).toEqual({
      before: { lowStockThreshold: 5 },
      after: { lowStockThreshold: 8 },
    });
  });

  it("refuses nonsense and unknown variants", async () => {
    const staff = await keeper();
    const variantId = await variantOf("S");

    for (const body of [
      { variantId, market: "PK", lowStockThreshold: -1 },
      { variantId, market: "PK", lowStockThreshold: 1.5 },
      { variantId, market: "PK" },
      { variantId, market: "PK", lowStockThreshold: 1, extra: 1 },
    ]) {
      expect(
        (await threshold(staff.cookie, body)).status,
        JSON.stringify(body),
      ).toBe(400);
    }
    expect(
      (
        await threshold(staff.cookie, {
          variantId: crypto.randomUUID(),
          market: "PK",
          lowStockThreshold: 1,
        })
      ).status,
    ).toBe(404);
  });
});

describe("the stock ledger", () => {
  it("shows adjustments, sales and returns, newest first, with who and which order", async () => {
    const staff = await signedInStaff({
      permissions: ["stock.view", "stock.adjust", "orders.refund"],
    });
    const variantId = await variantOf("S");
    await adjust(staff.cookie, {
      variantId,
      market: "PK",
      delta: 5,
      note: "Delivery",
    });
    const order = await placeTestOrder({ quantity: 1 });
    await payOrder(order.customer, order.number);

    const result = await movements(
      staff.cookie,
      `?variantId=${variantId}&market=PK`,
    );

    expect(result.status).toBe(200);
    // The shop's first stock (the import) is in the ledger too.
    expect(result.body.total).toBe(3);
    expect(result.body.items[2]).toMatchObject({
      reason: "initial_import",
      delta: 25,
    });
    expect(result.body.items[0]).toMatchObject({
      reason: "sale",
      delta: -1,
      orderNumber: order.number,
      by: null,
      market: "PK",
    });
    expect(result.body.items[1]).toMatchObject({
      reason: "adjustment",
      delta: 5,
      note: "Delivery",
      orderNumber: null,
      by: { id: staff.id, email: staff.email },
    });
  });

  it("filters by market, reason and date", async () => {
    const staff = await keeper();
    const variantId = await variantOf("S");
    await adjust(staff.cookie, { variantId, market: "PK", delta: 1 });
    await adjust(staff.cookie, {
      variantId,
      market: "DE",
      delta: 2,
      reason: "correction",
      note: "Recount",
    });
    const today = new Date().toISOString().slice(0, 10);

    expect(
      (
        await movements(staff.cookie, "?market=DE&reason=correction")
      ).body.items.map((item: { delta: number }) => item.delta),
    ).toEqual([2]);
    expect(
      (await movements(staff.cookie, "?reason=correction")).body.total,
    ).toBe(1);
    expect(
      (
        await movements(
          staff.cookie,
          `?reason=adjustment&from=${today}&to=${today}`,
        )
      ).body.total,
    ).toBe(1);
    expect(
      (
        await movements(
          staff.cookie,
          `?reason=correction&from=${today}&to=${today}`,
        )
      ).body.total,
    ).toBe(1);
    expect((await movements(staff.cookie, "?to=2000-01-01")).body.total).toBe(
      0,
    );
    expect((await movements(staff.cookie, "?reason=bogus")).status).toBe(400);
    expect((await movements(staff.cookie, "?variantId=nope")).status).toBe(400);
  });
});
