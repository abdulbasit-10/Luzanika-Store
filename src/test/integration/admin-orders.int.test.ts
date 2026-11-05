import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { GET as listRoute } from "@/app/api/v1/admin/orders/route";
import { GET as getRoute } from "@/app/api/v1/admin/orders/[number]/route";
import { POST as deleteRoute } from "@/app/api/v1/admin/orders/[number]/delete/route";
import { POST as statusRoute } from "@/app/api/v1/admin/orders/[number]/status/route";
import { GET as customerOrderRoute } from "@/app/api/v1/orders/[number]/route";
import { setEmailSender, type EmailMessage } from "@/server/email/email-sender";

import { signedInStaff } from "./admin-helpers";
import { call, exec, sql } from "./helpers";
import {
  importCatalog,
  payOrder,
  placeTestOrder,
  resetShopData,
  stockOf,
} from "./shop-helpers";

let sent: EmailMessage[];
let failEmail = false;

beforeAll(importCatalog);

beforeEach(async () => {
  await resetShopData();
  sent = [];
  failEmail = false;
  setEmailSender({
    send: async (message) => {
      if (failEmail) throw new Error("mail server down");
      sent.push(message);
    },
  });
});

afterEach(() => setEmailSender(undefined));

const list = (staffCookie: string | undefined, query = "") =>
  call(listRoute, {
    method: "GET",
    staffCookie,
    path: `/api/v1/admin/orders${query}`,
  });
const get = (staffCookie: string | undefined, number: string) =>
  call(getRoute, { method: "GET", staffCookie, params: { number } });
const move = (staffCookie: string | undefined, number: string, body: unknown) =>
  call(statusRoute, { method: "POST", staffCookie, params: { number }, body });

const remove = (staffCookie: string | undefined, number: string) =>
  call(deleteRoute, { method: "POST", staffCookie, params: { number } });

const manager = () =>
  signedInStaff({ permissions: ["orders.view", "orders.manage"] });

const SHIP = { status: "in_delivery" };

describe("who may see and change orders", () => {
  it("needs a signed-in staff member", async () => {
    const results = await Promise.all([
      list(undefined),
      get(undefined, "LZ-PK-000001"),
      move(undefined, "LZ-PK-000001", { status: "completed" }),
    ]);
    for (const result of results) expect(result.status).toBe(401);
  });

  it("refuses staff without the permission, and view alone cannot change", async () => {
    const order = await placeTestOrder();
    const nothing = await signedInStaff({ permissions: ["stock.view"] });
    const viewer = await signedInStaff({ permissions: ["orders.view"] });

    expect((await list(nothing.cookie)).status).toBe(403);
    expect((await get(nothing.cookie, order.number)).status).toBe(403);
    expect((await list(viewer.cookie)).status).toBe(200);
    expect((await get(viewer.cookie, order.number)).status).toBe(200);

    const refused = await move(viewer.cookie, order.number, {
      status: "cancelled",
    });
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe("forbidden");
  });
});

describe("the order list", () => {
  it("shows the orders of both markets, each in its own currency", async () => {
    const pk = await placeTestOrder({ market: "PK" });
    const de = await placeTestOrder({ market: "DE" });
    const staff = await manager();

    const result = await list(staff.cookie);

    expect(result.status).toBe(200);
    expect(result.body.total).toBe(2);
    const byNumber = new Map(
      result.body.items.map((item: { number: string }) => [item.number, item]),
    );
    expect(byNumber.get(pk.number)).toMatchObject({
      market: "PK",
      currency: "PKR",
      status: "waiting_payment",
      paymentStatus: "pending",
      customerEmail: "ada@example.com",
      recipientName: "Ada Lovelace",
      itemCount: 1,
      refundedTotal: 0,
    });
    expect(byNumber.get(de.number)).toMatchObject({
      market: "DE",
      currency: "EUR",
    });
    // Newest first.
    expect(result.body.items[0].number).toBe(de.number);
  });

  it("filters by market, status and payment status", async () => {
    const pk = await placeTestOrder({ market: "PK" });
    const de = await placeTestOrder({ market: "DE" });
    await payOrder(de.customer, de.number);
    const staff = await manager();

    const numbers = async (query: string) =>
      (await list(staff.cookie, query)).body.items.map(
        (item: { number: string }) => item.number,
      );

    expect(await numbers("?market=PK")).toEqual([pk.number]);
    expect(await numbers("?market=DE")).toEqual([de.number]);
    expect(await numbers("?status=processing")).toEqual([de.number]);
    expect(await numbers("?status=waiting_payment")).toEqual([pk.number]);
    expect(await numbers("?paymentStatus=paid")).toEqual([de.number]);
    expect(await numbers("?market=DE&status=waiting_payment")).toEqual([]);
  });

  it("searches by order number, email and recipient, and treats % as plain text", async () => {
    const a = await placeTestOrder({ email: "first.buyer@example.com" });
    await placeTestOrder({ email: "second.buyer@example.com" });
    const staff = await manager();

    const numbers = async (search: string) =>
      (
        await list(staff.cookie, `?search=${encodeURIComponent(search)}`)
      ).body.items.map((item: { number: string }) => item.number);

    expect(await numbers(a.number)).toEqual([a.number]);
    expect(await numbers(a.number.toLowerCase())).toEqual([a.number]);
    expect(await numbers("first.buyer")).toEqual([a.number]);
    expect(await numbers("Lovelace")).toHaveLength(2);
    expect(await numbers("nobody-by-this-name")).toEqual([]);
    expect(await numbers("%")).toEqual([]);
    expect(await numbers("_")).toEqual([]);
  });

  it("filters by date, where a plain end day includes that whole day", async () => {
    await placeTestOrder();
    const staff = await manager();
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000)
      .toISOString()
      .slice(0, 10);

    expect(
      (await list(staff.cookie, `?from=${today}&to=${today}`)).body.total,
    ).toBe(1);
    expect((await list(staff.cookie, `?from=${tomorrow}`)).body.total).toBe(0);
    expect((await list(staff.cookie, "?to=2000-01-01")).body.total).toBe(0);
  });

  it("pages the results", async () => {
    await placeTestOrder();
    await placeTestOrder();
    await placeTestOrder();
    const staff = await manager();

    const first = await list(staff.cookie, "?pageSize=2&page=1");
    const second = await list(staff.cookie, "?pageSize=2&page=2");

    expect(first.body).toMatchObject({ total: 3, page: 1, pageSize: 2 });
    expect(first.body.items).toHaveLength(2);
    expect(second.body.items).toHaveLength(1);
  });

  it("refuses filters that make no sense", async () => {
    const staff = await manager();

    for (const query of [
      "?status=bogus",
      "?market=FR",
      "?pageSize=101",
      "?page=0",
      "?from=yesterday",
      "?search=",
    ]) {
      expect((await list(staff.cookie, query)).status, query).toBe(400);
    }
  });

  it("shows the refunded amount of an order", async () => {
    const order = await placeTestOrder();
    await payOrder(order.customer, order.number);
    const staff = await manager();
    await exec(
      `INSERT INTO refunds (order_id, amount, currency, reason)
       SELECT id, 100, 'PKR', 'test' FROM orders WHERE number = :number`,
      { number: order.number },
    );

    const result = await list(staff.cookie);

    expect(result.body.items[0].refundedTotal).toBe(100);
  });
});

describe("one order", () => {
  it("shows everything staff need, and which moves are possible", async () => {
    const order = await placeTestOrder({ market: "PK", quantity: 2 });
    const staff = await manager();

    const result = await get(staff.cookie, order.number);

    expect(result.status).toBe(200);
    const body = result.body.order;
    expect(body).toMatchObject({
      number: order.number,
      market: "PK",
      currency: "PKR",
      status: "waiting_payment",
      allowedNextStatuses: ["cancelled"],
      paymentStatus: "pending",
      contact: { email: "ada@example.com", phone: "+49 30 1234567" },
      shipping: { name: "Ada Lovelace", city: "Lahore" },
      billing: null,
      customerId: order.customer.id,
    });
    expect(body.amounts).toMatchObject({
      total: order.total,
      refundedTotal: 0,
      refundableTotal: 0,
    });
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ quantity: 2, restockedQuantity: 0 });
    expect(body.items[0].id).toBeTruthy();
    expect(body.payments).toHaveLength(1);
    expect(body.payments[0]).toMatchObject({
      provider: "simulated",
      status: "pending",
    });
    expect(body.history).toHaveLength(1);
    expect(body.history[0]).toMatchObject({
      from: null,
      to: "waiting_payment",
      actorType: "customer",
    });
    expect(body.reservationExpiresAt).toBeTruthy();
  });

  it("offers the next move once the order is paid, and what can be refunded", async () => {
    const order = await placeTestOrder();
    await payOrder(order.customer, order.number);
    const staff = await manager();

    const body = (await get(staff.cookie, order.number)).body.order;

    expect(body).toMatchObject({
      status: "processing",
      allowedNextStatuses: ["in_delivery"],
      paymentStatus: "paid",
      reservationExpiresAt: null,
    });
    expect(body.amounts.refundableTotal).toBe(order.total);
  });

  it("treats a malformed or unknown order number as not found", async () => {
    const staff = await manager();

    expect((await get(staff.cookie, "nope")).status).toBe(404);
    expect((await get(staff.cookie, "LZ-PK-999999")).status).toBe(404);
    expect(
      (await move(staff.cookie, "LZ-PK-999999", { status: "completed" }))
        .status,
    ).toBe(404);
  });
});

describe("shipping an order", () => {
  it("moves a paid order to in delivery, tells the customer, and records it", async () => {
    const order = await placeTestOrder({ email: "buyer@example.com" });
    await payOrder(order.customer, order.number);
    const staff = await manager();

    const result = await move(staff.cookie, order.number, SHIP);

    expect(result.status).toBe(200);
    expect(result.body.order).toMatchObject({
      status: "in_delivery",
      allowedNextStatuses: ["completed"],
    });
    expect(result.body.order.shippedAt).toBeTruthy();

    const last = result.body.order.history.at(-1);
    expect(last).toMatchObject({
      from: "processing",
      to: "in_delivery",
      actorType: "staff",
      actor: { id: staff.id, email: staff.email },
      note: null,
    });

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("buyer@example.com");
    expect(sent[0].subject).toContain(order.number);
    expect(sent[0].text).toContain("on its way");
    expect(sent[0].text).not.toContain("Tracking");

    // The customer sees it in their own orders, too.
    const mine = await call(customerOrderRoute, {
      method: "GET",
      cookie: order.customer.cookie,
      params: { number: order.number },
    });
    expect(mine.body.order.status).toBe("in_delivery");

    const [audit] = await sql<{
      before: unknown;
      after: Record<string, unknown>;
      staff_email: string;
    }>(
      "SELECT before, after, staff_email FROM audit_log WHERE action = 'orders.status_change' AND entity_id = :number",
      { number: order.number },
    );
    expect(audit.staff_email).toBe(staff.email);
    expect(audit.before).toEqual({ status: "processing" });
    expect(audit.after).toMatchObject({ status: "in_delivery" });
  });

  it("takes no delivery details: a carrier or tracking number is refused", async () => {
    const order = await placeTestOrder();
    await payOrder(order.customer, order.number);
    const staff = await manager();

    for (const body of [
      { status: "in_delivery", carrier: "TCS" },
      { status: "in_delivery", trackingNumber: "123" },
      { status: "in_delivery", carrier: "TCS", trackingNumber: "123" },
    ]) {
      expect(
        (await move(staff.cookie, order.number, body)).status,
        JSON.stringify(body),
      ).toBe(400);
    }
    expect((await get(staff.cookie, order.number)).body.order.status).toBe(
      "processing",
    );
    expect(sent).toHaveLength(0);
  });

  it("completes an order that is in delivery, and tells the customer", async () => {
    const order = await placeTestOrder();
    await payOrder(order.customer, order.number);
    const staff = await manager();
    await move(staff.cookie, order.number, SHIP);
    sent = [];

    const result = await move(staff.cookie, order.number, {
      status: "completed",
    });

    expect(result.status).toBe(200);
    expect(result.body.order).toMatchObject({
      status: "completed",
      allowedNextStatuses: [],
    });
    expect(result.body.order.completedAt).toBeTruthy();
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain("complete");
  });

  it("allows only the defined moves", async () => {
    const unpaid = await placeTestOrder();
    const paid = await placeTestOrder();
    await payOrder(paid.customer, paid.number);
    const staff = await manager();
    const refused = async (number: string, body: unknown) => {
      const result = await move(staff.cookie, number, body);
      expect(result.status, JSON.stringify(body)).toBe(409);
      expect(result.body.error.code).toBe("invalid_status_transition");
    };

    await refused(unpaid.number, SHIP);
    await refused(unpaid.number, { status: "completed" });
    await refused(paid.number, { status: "completed" });
    await refused(paid.number, { status: "cancelled" });

    await move(staff.cookie, paid.number, SHIP);
    await refused(paid.number, SHIP);
    await refused(paid.number, { status: "cancelled" });
    await move(staff.cookie, paid.number, { status: "completed" });
    await refused(paid.number, { status: "completed" });
    await refused(paid.number, SHIP);
    await refused(paid.number, { status: "cancelled" });
    expect(sent).toHaveLength(2);
  });

  it("refuses a status staff cannot set, and fields it does not know", async () => {
    const order = await placeTestOrder();
    await payOrder(order.customer, order.number);
    const staff = await manager();

    for (const body of [
      { status: "processing" },
      { status: "refunded" },
      { status: "waiting_payment" },
      { status: "completed", note: "x" },
      { status: "nonsense" },
      {},
    ]) {
      expect(
        (await move(staff.cookie, order.number, body)).status,
        JSON.stringify(body),
      ).toBe(400);
    }
  });

  it("is not undone when the email cannot be sent", async () => {
    const order = await placeTestOrder();
    await payOrder(order.customer, order.number);
    const staff = await manager();
    failEmail = true;

    const result = await move(staff.cookie, order.number, SHIP);

    expect(result.status).toBe(200);
    expect(result.body.order.status).toBe("in_delivery");
  });

  it("lets only one of two simultaneous moves win", async () => {
    const order = await placeTestOrder();
    await payOrder(order.customer, order.number);
    const a = await manager();
    const b = await manager();

    const [first, second] = await Promise.all([
      move(a.cookie, order.number, SHIP),
      move(b.cookie, order.number, SHIP),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const history = await sql<{ n: string }>(
      "SELECT count(*) AS n FROM order_status_history h JOIN orders o ON o.id = h.order_id WHERE o.number = :number AND h.to_status = 'in_delivery'",
      { number: order.number },
    );
    expect(Number(history[0].n)).toBe(1);
    expect(sent).toHaveLength(1);
  });
});

describe("cancelling an unpaid order", () => {
  it("gives the stock back, records why, and tells the customer", async () => {
    const order = await placeTestOrder({
      quantity: 2,
      email: "buyer@example.com",
    });
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 25,
      reserved: 2,
    });
    const staff = await manager();

    const result = await move(staff.cookie, order.number, {
      status: "cancelled",
      reason: "Customer asked us to cancel",
    });

    expect(result.status).toBe(200);
    expect(result.body.order).toMatchObject({
      status: "cancelled",
      cancelReason: "Customer asked us to cancel",
      allowedNextStatuses: [],
      reservationExpiresAt: null,
    });
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 25,
      reserved: 0,
    });
    expect(result.body.order.history.at(-1)).toMatchObject({
      to: "cancelled",
      actorType: "staff",
      actor: { id: staff.id },
      note: "Customer asked us to cancel",
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("buyer@example.com");
    expect(sent[0].text).toContain("Customer asked us to cancel");
    expect(sent[0].text).toContain("No payment was taken");
  });

  it("uses a default reason when none is given, and cancelling twice is refused", async () => {
    const order = await placeTestOrder();
    const staff = await manager();

    const first = await move(staff.cookie, order.number, {
      status: "cancelled",
    });
    expect(first.body.order.cancelReason).toBe("Cancelled by staff");

    const again = await move(staff.cookie, order.number, {
      status: "cancelled",
    });
    expect(again.status).toBe(409);
    expect(again.body.error.message).toContain("already cancelled");
    expect(sent).toHaveLength(1);
  });

  it("explains that a paid order must be refunded instead", async () => {
    const order = await placeTestOrder();
    await payOrder(order.customer, order.number);
    const staff = await manager();

    const result = await move(staff.cookie, order.number, {
      status: "cancelled",
    });

    expect(result.status).toBe(409);
    expect(result.body.error.message).toMatch(/refund/i);
    expect(await stockOf(order.variantId)).toEqual({
      on_hand: 24,
      reserved: 0,
    });
  });

  it("saves the audit row together with the cancellation", async () => {
    const order = await placeTestOrder();
    const staff = await manager();

    await move(staff.cookie, order.number, {
      status: "cancelled",
      reason: "Duplicate order",
    });

    const [audit] = await sql<{
      after: Record<string, string>;
      before: Record<string, string>;
    }>(
      "SELECT before, after FROM audit_log WHERE action = 'orders.status_change' AND entity_id = :number",
      { number: order.number },
    );
    expect(audit.before.status).toBe("waiting_payment");
    expect(audit.after).toMatchObject({
      status: "cancelled",
      reason: "Duplicate order",
    });
  });
});

describe("the status dropdown of the list", () => {
  it("offers each order only the moves it may make", async () => {
    const pending = await placeTestOrder();
    const cod = await placeTestOrder({ paymentMethod: "cod" });
    const paid = await placeTestOrder();
    await payOrder(paid.customer, paid.number);
    const staff = await manager();

    const items = (await list(staff.cookie)).body.items as {
      number: string;
      allowedMoves: string[];
      deleted: boolean;
    }[];
    const movesOf = (number: string) =>
      items.find((item) => item.number === number)?.allowedMoves;

    expect(movesOf(pending.number)).toEqual(["cancelled"]);
    expect(movesOf(cod.number)).toEqual(["in_delivery", "cancelled"]);
    expect(movesOf(paid.number)).toEqual(["in_delivery"]);
    expect(items.every((item) => item.deleted === false)).toBe(true);
  });

  it("locks a delivered order: no status change, no delete", async () => {
    const order = await placeTestOrder();
    await payOrder(order.customer, order.number);
    const staff = await manager();
    await move(staff.cookie, order.number, SHIP);
    await move(staff.cookie, order.number, { status: "completed" });

    const row = (await list(staff.cookie)).body.items[0];
    expect(row.status).toBe("completed");
    expect(row.allowedMoves).toEqual([]);

    for (const body of [
      SHIP,
      { status: "completed" },
      { status: "cancelled" },
    ]) {
      const result = await move(staff.cookie, order.number, body);
      expect(result.status, JSON.stringify(body)).toBe(409);
      expect(result.body.error.message).toMatch(/locked/);
    }
    const removed = await remove(staff.cookie, order.number);
    expect(removed.status).toBe(409);
    expect(removed.body.error.message).toMatch(/locked/);
  });
});

describe("deleting a cancelled order", () => {
  const cancelled = async (staff: { cookie: string }) => {
    const order = await placeTestOrder();
    await move(staff.cookie, order.number, { status: "cancelled" });
    return order;
  };

  it("hides it from the list but keeps the order, and records who did it", async () => {
    const staff = await manager();
    const order = await cancelled(staff);
    const other = await placeTestOrder();

    const result = await remove(staff.cookie, order.number);

    expect(result.status).toBe(200);
    expect(result.body.order.deletedAt).toBeTruthy();
    const names = async (query: string) =>
      (await list(staff.cookie, query)).body.items.map(
        (item: { number: string }) => item.number,
      );
    expect(await names("")).toEqual([other.number]);
    expect(await names("?status=cancelled")).toEqual([]);

    const shown = (await list(staff.cookie, "?status=deleted")).body.items;
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({
      number: order.number,
      deleted: true,
      allowedMoves: [],
    });

    // The order is still there for staff and for the customer.
    expect((await get(staff.cookie, order.number)).status).toBe(200);
    const mine = await call(customerOrderRoute, {
      method: "GET",
      cookie: order.customer.cookie,
      params: { number: order.number },
    });
    expect(mine.body.order.status).toBe("cancelled");

    const [audit] = await sql<{ staff_email: string; after: unknown }>(
      "SELECT staff_email, after FROM audit_log WHERE action = 'orders.delete' AND entity_id = :number",
      { number: order.number },
    );
    expect(audit.staff_email).toBe(staff.email);
    expect(audit.after).toEqual({ status: "cancelled", deleted: true });
  });

  it("offers Delete only on a cancelled order", async () => {
    const staff = await manager();
    const order = await cancelled(staff);

    const row = (await list(staff.cookie)).body.items[0];
    expect(row.allowedMoves).toEqual(["deleted"]);
    expect(order.number).toBe(row.number);
  });

  it("refuses an order that is not cancelled, and a second delete", async () => {
    const staff = await manager();
    const pending = await placeTestOrder();
    const paid = await placeTestOrder();
    await payOrder(paid.customer, paid.number);
    const order = await cancelled(staff);

    expect((await remove(staff.cookie, pending.number)).status).toBe(409);
    expect((await remove(staff.cookie, paid.number)).status).toBe(409);
    expect((await remove(staff.cookie, order.number)).status).toBe(200);
    const again = await remove(staff.cookie, order.number);
    expect(again.status).toBe(409);
    expect(again.body.error.message).toMatch(/already deleted/);
    expect((await remove(staff.cookie, "LZ-PK-999999")).status).toBe(404);
  });

  it("needs orders.manage", async () => {
    const staff = await manager();
    const order = await cancelled(staff);
    const viewer = await signedInStaff({ permissions: ["orders.view"] });

    expect((await remove(undefined, order.number)).status).toBe(401);
    expect((await remove(viewer.cookie, order.number)).status).toBe(403);
  });

  it("leaves deleted orders out of the dashboard counts", async () => {
    const staff = await manager();
    const order = await cancelled(staff);
    await remove(staff.cookie, order.number);

    const [row] = await sql<{ n: string }>(
      "SELECT count(*) AS n FROM orders WHERE deleted_at IS NOT NULL",
    );
    expect(Number(row.n)).toBe(1);
  });
});
