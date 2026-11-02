import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { GET as listRoute } from "@/app/api/v1/admin/orders/route";
import { GET as getRoute } from "@/app/api/v1/admin/orders/[number]/route";
import { POST as refundRoute } from "@/app/api/v1/admin/orders/[number]/refunds/route";
import { POST as statusRoute } from "@/app/api/v1/admin/orders/[number]/status/route";
import { GET as customerOrderRoute } from "@/app/api/v1/orders/[number]/route";
import { setEmailSender } from "@/server/email/email-sender";

import { signedInStaff } from "./admin-helpers";
import { call, exec, sql } from "./helpers";
import {
  importCatalog,
  payOrder,
  placeTestOrder,
  resetShopData,
  stockOf,
  type PlacedTestOrder,
} from "./shop-helpers";

beforeAll(importCatalog);

beforeEach(async () => {
  await resetShopData();
  setEmailSender({ send: async () => {} });
});

afterEach(() => setEmailSender(undefined));

const refund = (
  staffCookie: string | undefined,
  number: string,
  body: unknown,
) =>
  call(refundRoute, { method: "POST", staffCookie, params: { number }, body });
const getOrder = async (staffCookie: string, number: string) =>
  (await call(getRoute, { method: "GET", staffCookie, params: { number } }))
    .body.order;

const refunder = () =>
  signedInStaff({ permissions: ["orders.view", "orders.refund"] });

/** A paid order of two units of one item (stock is then 23 on hand). */
async function paidOrder(
  options: { market?: "PK" | "DE"; quantity?: number } = {},
): Promise<PlacedTestOrder> {
  const order = await placeTestOrder({
    quantity: options.quantity ?? 2,
    market: options.market,
  });
  await payOrder(order.customer, order.number);
  return order;
}

describe("who may refund", () => {
  it("needs a signed-in staff member with the refund permission", async () => {
    const order = await paidOrder();
    const manager = await signedInStaff({
      permissions: ["orders.view", "orders.manage"],
    });
    const body = { amount: 100, reason: "test" };

    expect((await refund(undefined, order.number, body)).status).toBe(401);
    const refused = await refund(manager.cookie, order.number, body);
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe("forbidden");
    expect(
      (await getOrder(manager.cookie, order.number)).amounts.refundedTotal,
    ).toBe(0);
  });
});

describe("a partial refund", () => {
  it("records the amount and reason, keeps the order's status, and shows the rest that can be refunded", async () => {
    const order = await paidOrder();
    const staff = await refunder();

    const result = await refund(staff.cookie, order.number, {
      amount: 25_000,
      reason: "One unit arrived damaged",
    });

    expect(result.status).toBe(201);
    expect(result.headers.get("location")).toBe(
      `/api/v1/admin/orders/${order.number}`,
    );
    const body = result.body.order;
    expect(body).toMatchObject({
      status: "processing",
      paymentStatus: "partially_refunded",
      amounts: {
        total: order.total,
        refundedTotal: 25_000,
        refundableTotal: order.total - 25_000,
      },
    });
    expect(body.refunds).toHaveLength(1);
    expect(body.refunds[0]).toMatchObject({
      amount: 25_000,
      currency: "PKR",
      reason: "One unit arrived damaged",
      restock: false,
      items: [],
      by: { id: staff.id, email: staff.email },
    });
    expect(body.history.at(-1)).toMatchObject({
      from: "processing",
      to: "processing",
      actorType: "staff",
      actor: { id: staff.id },
    });
    expect(body.history.at(-1).note).toContain("Partial refund of 250.00 PKR");
    expect(body.history.at(-1).note).toContain("One unit arrived damaged");

    // Nothing went back on the shelf.
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 23,
      reserved: 0,
    });

    // The customer sees the payment status; their order status is unchanged.
    const mine = await call(customerOrderRoute, {
      method: "GET",
      cookie: order.customer.cookie,
      params: { number: order.number },
    });
    expect(mine.body.order).toMatchObject({
      status: "processing",
      paymentStatus: "partially_refunded",
    });
  });

  it("can be repeated until the whole amount is given back, then the order is refunded", async () => {
    const order = await paidOrder();
    const staff = await refunder();
    const half = Math.floor(order.total / 2);

    const first = await refund(staff.cookie, order.number, {
      amount: half,
      reason: "First part",
    });
    expect(first.body.order.paymentStatus).toBe("partially_refunded");

    const second = await refund(staff.cookie, order.number, {
      amount: order.total - half,
      reason: "Second part",
    });
    expect(second.status).toBe(201);
    expect(second.body.order).toMatchObject({
      status: "refunded",
      paymentStatus: "refunded",
      amounts: { refundedTotal: order.total, refundableTotal: 0 },
    });
    expect(second.body.order.refunds).toHaveLength(2);
    expect(second.body.order.allowedNextStatuses).toEqual([]);
  });

  it("refuses more than is left to refund, counting earlier refunds", async () => {
    const order = await paidOrder();
    const staff = await refunder();

    const tooMuch = await refund(staff.cookie, order.number, {
      amount: order.total + 1,
      reason: "x",
    });
    expect(tooMuch.status).toBe(400);
    expect(tooMuch.body.error.fields.amount).toContain(String(order.total));

    await refund(staff.cookie, order.number, {
      amount: order.total - 1_000,
      reason: "most",
    });
    const again = await refund(staff.cookie, order.number, {
      amount: 1_001,
      reason: "too much now",
    });
    expect(again.status).toBe(400);
    expect(again.body.error.fields.amount).toContain("1000");
    expect(
      (await getOrder(staff.cookie, order.number)).amounts.refundedTotal,
    ).toBe(order.total - 1_000);
  });

  it("works on an order that is in delivery or completed (returns)", async () => {
    const order = await paidOrder();
    const staff = await signedInStaff({
      permissions: ["orders.view", "orders.manage", "orders.refund"],
    });
    await call(statusRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { number: order.number },
      body: { status: "in_delivery", carrier: "TCS", trackingNumber: "1" },
    });
    await call(statusRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { number: order.number },
      body: { status: "completed" },
    });

    const result = await refund(staff.cookie, order.number, {
      amount: 5_000,
      reason: "Customer returned one item",
    });

    expect(result.status).toBe(201);
    expect(result.body.order).toMatchObject({
      status: "completed",
      paymentStatus: "partially_refunded",
    });
  });

  it("uses the order's own currency", async () => {
    const order = await paidOrder({ market: "DE" });
    const staff = await refunder();

    const result = await refund(staff.cookie, order.number, {
      amount: 500,
      reason: "Goodwill",
    });

    expect(result.body.order.refunds[0].currency).toBe("EUR");
    expect(result.body.order.history.at(-1).note).toContain("5.00 EUR");
  });
});

describe("refusing refunds that do not make sense", () => {
  it("an order that was never paid or was cancelled has nothing to refund", async () => {
    const unpaid = await placeTestOrder();
    const cancelled = await placeTestOrder();
    const staff = await signedInStaff({
      permissions: ["orders.view", "orders.manage", "orders.refund"],
    });
    await call(statusRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { number: cancelled.number },
      body: { status: "cancelled" },
    });

    const a = await refund(staff.cookie, unpaid.number, {
      amount: 100,
      reason: "x",
    });
    const b = await refund(staff.cookie, cancelled.number, {
      amount: 100,
      reason: "x",
    });

    expect(a.status).toBe(409);
    expect(a.body.error.message).toContain("not been paid");
    expect(b.status).toBe(409);
    expect(b.body.error.message).toContain("never paid");
  });

  it("an order refunded in full cannot be refunded again, or moved along", async () => {
    const order = await paidOrder();
    const staff = await signedInStaff({
      permissions: ["orders.view", "orders.manage", "orders.refund"],
    });
    await refund(staff.cookie, order.number, {
      amount: order.total,
      reason: "Full",
    });

    const again = await refund(staff.cookie, order.number, {
      amount: 1,
      reason: "x",
    });
    expect(again.status).toBe(409);
    expect(again.body.error.message).toContain("already been refunded");

    const moved = await call(statusRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { number: order.number },
      body: { status: "in_delivery", carrier: "TCS", trackingNumber: "1" },
    });
    expect(moved.status).toBe(409);
  });

  it("refuses bad input and fields it does not know", async () => {
    const order = await paidOrder();
    const staff = await refunder();
    const bad: Record<string, unknown>[] = [
      {},
      { amount: 100 },
      { reason: "x" },
      { amount: 0, reason: "x" },
      { amount: -5, reason: "x" },
      { amount: 10.5, reason: "x" },
      { amount: "100", reason: "x" },
      { amount: 100, reason: "   " },
      { amount: 100, reason: "a".repeat(501) },
      { amount: 100, reason: "x", restock: "yes" },
      { amount: 100, reason: "x", extra: true },
      {
        amount: 100,
        reason: "x",
        restock: true,
        items: [{ orderItemId: "nope", quantity: 1 }],
      },
      {
        amount: 100,
        reason: "x",
        restock: true,
        items: [{ orderItemId: crypto.randomUUID(), quantity: 0 }],
      },
    ];

    for (const body of bad) {
      expect(
        (await refund(staff.cookie, order.number, body)).status,
        JSON.stringify(body),
      ).toBe(400);
    }
    expect((await getOrder(staff.cookie, order.number)).refunds).toHaveLength(
      0,
    );
  });

  it("not found for a malformed or unknown order", async () => {
    const staff = await refunder();

    expect(
      (await refund(staff.cookie, "nope", { amount: 1, reason: "x" })).status,
    ).toBe(404);
    expect(
      (await refund(staff.cookie, "LZ-PK-999999", { amount: 1, reason: "x" }))
        .status,
    ).toBe(404);
  });
});

describe("putting items back into stock", () => {
  it("a full refund with restock gives back every item, writes the ledger and releases the stock", async () => {
    const order = await paidOrder();
    const staff = await refunder();
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 23,
      reserved: 0,
    });

    const result = await refund(staff.cookie, order.number, {
      amount: order.total,
      reason: "Cancelled before shipping",
      restock: true,
    });

    expect(result.status).toBe(201);
    const body = result.body.order;
    expect(body).toMatchObject({
      status: "refunded",
      paymentStatus: "refunded",
      stockState: "released",
    });
    expect(body.items[0].restockedQuantity).toBe(2);
    expect(body.refunds[0]).toMatchObject({ restock: true });
    expect(body.refunds[0].items).toEqual([
      { orderItemId: body.items[0].id, quantity: 2 },
    ]);

    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 25,
      reserved: 0,
    });
    const [movement] = await sql<{
      delta: number;
      reason: string;
      staff_id: string;
      note: string;
    }>(
      `SELECT m.delta, m.reason, m.staff_id, m.note FROM stock_movements m
       JOIN orders o ON o.id = m.order_id WHERE o.number = :number AND m.reason = 'return'`,
      { number: order.number },
    );
    expect(movement).toMatchObject({
      delta: 2,
      reason: "return",
      staff_id: staff.id,
    });
    expect(movement.note).toContain(order.number);
  });

  it("a full refund without restock gives back the money but not the items", async () => {
    const order = await paidOrder();
    const staff = await refunder();

    const result = await refund(staff.cookie, order.number, {
      amount: order.total,
      reason: "Lost in the post",
    });

    expect(result.body.order).toMatchObject({
      status: "refunded",
      stockState: "committed",
    });
    expect(result.body.order.items[0].restockedQuantity).toBe(0);
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 23,
      reserved: 0,
    });
  });

  it("puts back only the listed quantity, and the rest later, but never more than was bought", async () => {
    const order = await paidOrder();
    const staff = await refunder();
    const itemId = (await getOrder(staff.cookie, order.number)).items[0].id;

    const first = await refund(staff.cookie, order.number, {
      amount: 10_000,
      reason: "One came back",
      restock: true,
      items: [{ orderItemId: itemId, quantity: 1 }],
    });
    expect(first.status).toBe(201);
    expect(first.body.order.items[0].restockedQuantity).toBe(1);
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 24,
      reserved: 0,
    });

    const tooMany = await refund(staff.cookie, order.number, {
      amount: 100,
      reason: "x",
      restock: true,
      items: [{ orderItemId: itemId, quantity: 2 }],
    });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.error.fields.items).toContain("Only 1");
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 24,
      reserved: 0,
    });

    // Without a list, "everything not back yet" is the one remaining unit.
    const rest = await refund(staff.cookie, order.number, {
      amount: 100,
      reason: "Other one",
      restock: true,
    });
    expect(rest.status).toBe(201);
    expect(rest.body.order.items[0].restockedQuantity).toBe(2);
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 25,
      reserved: 0,
    });

    const nothingLeft = await refund(staff.cookie, order.number, {
      amount: 100,
      reason: "x",
      restock: true,
    });
    expect(nothingLeft.status).toBe(400);
    expect(nothingLeft.body.error.fields.restock).toBeTruthy();
  });

  it("refuses a list of items when nothing is going back, and an item from another order", async () => {
    const order = await paidOrder();
    const other = await paidOrder();
    const staff = await refunder();
    const itemId = (await getOrder(staff.cookie, order.number)).items[0].id;
    const otherItemId = (await getOrder(staff.cookie, other.number)).items[0]
      .id;

    const withoutRestock = await refund(staff.cookie, order.number, {
      amount: 100,
      reason: "x",
      items: [{ orderItemId: itemId, quantity: 1 }],
    });
    expect(withoutRestock.status).toBe(400);
    expect(withoutRestock.body.error.fields.items).toBeTruthy();

    const foreign = await refund(staff.cookie, order.number, {
      amount: 100,
      reason: "x",
      restock: true,
      items: [{ orderItemId: otherItemId, quantity: 1 }],
    });
    expect(foreign.status).toBe(400);
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 21,
      reserved: 0,
    });
  });

  it("restocks into the order's own market only", async () => {
    const order = await paidOrder({ market: "DE" });
    const staff = await refunder();
    expect(await stockOf(order.variantId, "DE")).toEqual({
      on_hand: 23,
      reserved: 0,
    });
    expect(await stockOf(order.variantId, "PK")).toEqual({
      on_hand: 25,
      reserved: 0,
    });

    await refund(staff.cookie, order.number, {
      amount: order.total,
      reason: "Return",
      restock: true,
    });

    expect(await stockOf(order.variantId, "DE")).toEqual({
      on_hand: 25,
      reserved: 0,
    });
    expect(await stockOf(order.variantId, "PK")).toEqual({
      on_hand: 25,
      reserved: 0,
    });
  });

  it("creates the stock row when the variant has none in that market any more", async () => {
    const order = await paidOrder({ quantity: 1 });
    const staff = await refunder();
    await exec(
      "DELETE FROM inventory WHERE variant_id = :id AND market = 'PK'",
      { id: order.variantId },
    );

    const result = await refund(staff.cookie, order.number, {
      amount: order.total,
      reason: "Return",
      restock: true,
    });

    expect(result.status).toBe(201);
    expect(await stockOf(order.variantId)).toEqual({ on_hand: 1, reserved: 0 });
  });

  it("cancelling a paid order before it ships is a full refund with restock", async () => {
    const order = await paidOrder({ quantity: 1 });
    const staff = await signedInStaff({
      permissions: ["orders.view", "orders.manage", "orders.refund"],
    });
    // Cancelling directly is refused and points to a refund...
    const direct = await call(statusRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { number: order.number },
      body: { status: "cancelled" },
    });
    expect(direct.status).toBe(409);
    expect(direct.body.error.message).toMatch(/refund/i);

    // ...which ends the order as refunded, with the stock back on sale.
    const result = await refund(staff.cookie, order.number, {
      amount: order.total,
      reason: "Customer changed their mind",
      restock: true,
    });
    expect(result.body.order.status).toBe("refunded");
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 25,
      reserved: 0,
    });
  });
});

describe("two refunds at the same moment", () => {
  it("never give back more than was paid", async () => {
    const order = await paidOrder();
    const a = await refunder();
    const b = await refunder();

    const [first, second] = await Promise.all([
      refund(a.cookie, order.number, {
        amount: order.total,
        reason: "A",
        restock: true,
      }),
      refund(b.cookie, order.number, {
        amount: order.total,
        reason: "B",
        restock: true,
      }),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    const body = await getOrder(a.cookie, order.number);
    expect(body.refunds).toHaveLength(1);
    expect(body.amounts.refundedTotal).toBe(order.total);
    // The items were put back once, not twice.
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 25,
      reserved: 0,
    });
  });

  it("two partial refunds that together are too much: only one goes through", async () => {
    const order = await paidOrder();
    const a = await refunder();
    const b = await refunder();
    const sixty = Math.ceil(order.total * 0.6);

    const [first, second] = await Promise.all([
      refund(a.cookie, order.number, { amount: sixty, reason: "A" }),
      refund(b.cookie, order.number, { amount: sixty, reason: "B" }),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 400]);
    expect((await getOrder(a.cookie, order.number)).amounts.refundedTotal).toBe(
      sixty,
    );
  });
});

describe("records", () => {
  it("writes the refund to the audit log with before, after and the items restocked", async () => {
    const order = await paidOrder();
    const staff = await refunder();
    await refund(staff.cookie, order.number, {
      amount: 7_000,
      reason: "Damaged",
      restock: true,
      items: [
        {
          orderItemId: (await getOrder(staff.cookie, order.number)).items[0].id,
          quantity: 1,
        },
      ],
    });

    const [row] = await sql<{
      staff_email: string;
      before: Record<string, unknown>;
      after: {
        refundedTotal: number;
        refund: {
          amount: number;
          restock: boolean;
          items: unknown[];
          reason: string;
        };
      };
    }>(
      "SELECT staff_email, before, after FROM audit_log WHERE action = 'orders.refund' AND entity_id = :number",
      {
        number: order.number,
      },
    );
    expect(row.staff_email).toBe(staff.email);
    expect(row.before).toMatchObject({
      status: "processing",
      paymentStatus: "paid",
      refundedTotal: 0,
    });
    expect(row.after).toMatchObject({ refundedTotal: 7_000 });
    expect(row.after.refund).toMatchObject({
      amount: 7_000,
      restock: true,
      reason: "Damaged",
    });
    expect(row.after.refund.items).toHaveLength(1);
  });

  it("shows the refunded total in the order list", async () => {
    const order = await paidOrder();
    const staff = await refunder();
    await refund(staff.cookie, order.number, {
      amount: 3_000,
      reason: "Goodwill",
    });

    const result = await call(listRoute, {
      method: "GET",
      staffCookie: staff.cookie,
      path: "/api/v1/admin/orders?paymentStatus=partially_refunded",
    });

    expect(result.body.items).toHaveLength(1);
    expect(result.body.items[0]).toMatchObject({
      number: order.number,
      refundedTotal: 3_000,
    });
  });
});
