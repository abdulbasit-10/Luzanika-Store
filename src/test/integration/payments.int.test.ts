import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { GET as dashboardRoute } from "@/app/api/v1/admin/dashboard/route";
import { GET as adminOrderRoute } from "@/app/api/v1/admin/orders/[number]/route";
import { POST as confirmRoute } from "@/app/api/v1/admin/orders/[number]/payment/confirm/route";
import { POST as rejectRoute } from "@/app/api/v1/admin/orders/[number]/payment/reject/route";
import { GET as screenshotRoute } from "@/app/api/v1/admin/orders/[number]/payment-proofs/[proofId]/screenshot/route";
import { POST as statusRoute } from "@/app/api/v1/admin/orders/[number]/status/route";
import { POST as refundRoute } from "@/app/api/v1/admin/orders/[number]/refunds/route";
import { PATCH as patchSettingsRoute } from "@/app/api/v1/admin/settings/route";
import { GET as mediaRoute } from "@/app/api/v1/media/products/[file]/route";
import { POST as cancelRoute } from "@/app/api/v1/orders/[number]/cancel/route";
import { POST as proofRoute } from "@/app/api/v1/orders/[number]/payment-proof/route";
import { GET as getRoute } from "@/app/api/v1/orders/[number]/route";
import { POST as createRoute } from "@/app/api/v1/orders/route";
import { GET as paymentMethodsRoute } from "@/app/api/v1/payment-methods/route";
import { setEmailSender, type EmailMessage } from "@/server/email/email-sender";
import { releaseExpiredReservations } from "@/server/services/order-service";
import { setStorage } from "@/server/storage";
import { LocalDiskStorage } from "@/server/storage/local-disk-storage";

import { signedInStaff } from "./admin-helpers";
import { call, exec, sql } from "./helpers";
import {
  addToCart,
  importCatalog,
  orderBody,
  placeTestOrder,
  resetShopData,
  signUpCustomer,
  stockOf,
  variantOf,
  type PlacedTestOrder,
} from "./shop-helpers";

const BANK = {
  bankName: "Meezan Bank",
  accountTitle: "Luzanika Pvt Ltd",
  accountNumber: "PK36 MEZN 0000 1234 5678 9012",
};
const WALLET = { accountTitle: "Luzanika", number: "0300 1234567" };

let uploadsDir: string;
let storage: LocalDiskStorage;
let sent: EmailMessage[];

beforeAll(async () => {
  await importCatalog();
  uploadsDir = await mkdtemp(path.join(os.tmpdir(), "luzanika-payments-"));
  storage = new LocalDiskStorage(uploadsDir);
});
afterAll(async () => {
  await resetPaymentSettings();
  setStorage(undefined);
  await rm(uploadsDir, { recursive: true, force: true });
});

async function resetPaymentSettings() {
  await exec(
    "UPDATE shop_settings SET payment_details = '{}'::jsonb, manual_hold_hours = 48",
  );
}

beforeEach(async () => {
  await resetShopData();
  await exec(
    `UPDATE shop_settings SET manual_hold_hours = 48, payment_details = CAST(:details AS jsonb)`,
    {
      details: JSON.stringify({
        bank: BANK,
        easypaisa: WALLET,
        jazzcash: WALLET,
      }),
    },
  );
  setStorage(storage);
  sent = [];
  setEmailSender({
    send: async (message) => {
      sent.push(message);
    },
  });
});
afterEach(async () => {
  setEmailSender(undefined);
  await resetShopData();
});

type Cookie = string | undefined;

const checker = () => signedInStaff({ permissions: ["payments.verify"] });
const viewer = () => signedInStaff({ permissions: ["orders.view"] });
const manager = () =>
  signedInStaff({ permissions: ["orders.view", "orders.manage"] });

const adminOrder = (staffCookie: Cookie, number: string) =>
  call(adminOrderRoute, {
    method: "GET",
    staffCookie,
    params: { number },
  });
const confirm = (staffCookie: Cookie, number: string, body: unknown = {}) =>
  call(confirmRoute, { staffCookie, params: { number }, body });
const reject = (staffCookie: Cookie, number: string, body: unknown) =>
  call(rejectRoute, { staffCookie, params: { number }, body });

function proofForm(fields: { transactionId?: string; screenshot?: Buffer }) {
  const form = new FormData();
  if (fields.transactionId !== undefined) {
    form.set("transactionId", fields.transactionId);
  }
  if (fields.screenshot) {
    form.set(
      "screenshot",
      new File([new Uint8Array(fields.screenshot)], "payment.jpg", {
        type: "image/jpeg",
      }),
    );
  }
  return form;
}

const sendProof = (
  placed: PlacedTestOrder,
  fields: { transactionId?: string; screenshot?: Buffer },
) =>
  call(proofRoute, {
    cookie: placed.customer.cookie,
    params: { number: placed.number },
    form: proofForm(fields),
  });

const myOrder = (placed: PlacedTestOrder) =>
  call(getRoute, {
    method: "GET",
    cookie: placed.customer.cookie,
    params: { number: placed.number },
  });

async function picture(width = 1200, height = 900) {
  return sharp({
    create: { width, height, channels: 3, background: "#228844" },
  })
    .jpeg()
    .toBuffer();
}

let tid = 0;
const nextTid = () =>
  `TID${Date.now().toString(36)}${(tid += 1)}`.toUpperCase();

const dbOrder = async (number: string) =>
  (
    await sql<{
      status: string;
      payment_status: string;
      stock_state: string;
      reservation_expires_at: Date | null;
      paid_at: Date | null;
    }>(
      `SELECT status, payment_status, stock_state, reservation_expires_at, paid_at FROM orders WHERE number = :number`,
      { number },
    )
  )[0];

// ------------------------------------------------------------ what is offered

describe("which payment methods a shopper is offered", () => {
  it("offers cash on delivery and every transfer that is set up in Pakistan", async () => {
    const result = await call(paymentMethodsRoute, {
      method: "GET",
      path: "/api/v1/payment-methods?market=PK",
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      market: "PK",
      holdHours: 48,
      methods: [
        { method: "cod" },
        { method: "bank_transfer", details: BANK },
        { method: "easypaisa", details: WALLET },
        { method: "jazzcash", details: WALLET },
      ],
    });
  });

  it("leaves out a transfer whose account details are not set", async () => {
    await exec(
      "UPDATE shop_settings SET payment_details = CAST(:details AS jsonb)",
      { details: JSON.stringify({ jazzcash: WALLET }) },
    );
    const result = await call(paymentMethodsRoute, {
      method: "GET",
      path: "/api/v1/payment-methods?market=PK",
    });
    expect(
      result.body.methods.map((item: { method: string }) => item.method),
    ).toEqual(["cod", "jazzcash"]);

    await exec("UPDATE shop_settings SET payment_details = '{}'::jsonb");
    const bare = await call(paymentMethodsRoute, {
      method: "GET",
      path: "/api/v1/payment-methods?market=PK",
    });
    expect(bare.body.methods).toEqual([{ method: "cod" }]);
  });

  it("offers only cards in Germany, and needs a market", async () => {
    const de = await call(paymentMethodsRoute, {
      method: "GET",
      path: "/api/v1/payment-methods?market=DE",
    });
    expect(de.body).toEqual({ market: "DE", methods: [{ method: "card" }] });

    expect(
      (
        await call(paymentMethodsRoute, {
          method: "GET",
          path: "/api/v1/payment-methods",
        })
      ).status,
    ).toBe(400);
  });
});

describe("staff set where the money goes", () => {
  const patch = (cookie: Cookie, body: unknown) =>
    call(patchSettingsRoute, { method: "PATCH", staffCookie: cookie, body });

  it("saves, changes and removes the bank and wallet details", async () => {
    await resetPaymentSettings();
    const boss = await signedInStaff({ permissions: ["settings.manage"] });

    const saved = await patch(boss.cookie, {
      payments: { manualHoldHours: 24, bank: BANK, easypaisa: WALLET },
    });
    expect(saved.status).toBe(200);
    expect(saved.body.settings.payments).toEqual({
      manualHoldHours: 24,
      bank: BANK,
      easypaisa: WALLET,
      jazzcash: null,
    });

    // A method that is left out stays; null removes one.
    const changed = await patch(boss.cookie, {
      payments: { jazzcash: WALLET, easypaisa: null },
    });
    expect(changed.body.settings.payments).toEqual({
      manualHoldHours: 24,
      bank: BANK,
      easypaisa: null,
      jazzcash: WALLET,
    });
  });

  it("refuses details that make no sense", async () => {
    const boss = await signedInStaff({ permissions: ["settings.manage"] });
    for (const payments of [
      { manualHoldHours: 0 },
      { manualHoldHours: 1000 },
      { bank: { bankName: "Bank" } },
      { bank: { ...BANK, accountNumber: "x" } },
      { easypaisa: { accountTitle: "Luzanika", number: "call me" } },
      { easypaisa: { ...WALLET, extra: true } },
      { cash: {} },
    ]) {
      expect(
        (await patch(boss.cookie, { payments })).status,
        JSON.stringify(payments),
      ).toBe(400);
    }
  });
});

// ------------------------------------------------------- cash on delivery

describe("cash on delivery", () => {
  it("goes straight to processing with the payment pending, and sells the stock", async () => {
    const before = await stockOf(await variantOf("S"));
    const placed = await placeTestOrder({
      paymentMethod: "cod",
      quantity: 2,
    });

    const order = (await myOrder(placed)).body.order;
    expect(order).toMatchObject({
      status: "processing",
      paymentStatus: "pending",
      paymentMethod: "cod",
      paymentProvider: "manual",
      paidAt: null,
      reservationExpiresAt: null,
      paymentProof: null,
    });

    const stock = await stockOf(placed.variantId);
    expect(stock.on_hand).toBe(before.on_hand - 2);
    expect(stock.reserved).toBe(before.reserved);
    const [row] = await sql<{ stock_state: string }>(
      "SELECT stock_state FROM orders WHERE number = :number",
      { number: placed.number },
    );
    expect(row.stock_state).toBe("committed");
  });

  it("has no limit on the amount", async () => {
    const placed = await placeTestOrder({
      paymentMethod: "cod",
      quantity: 20,
    });
    expect(placed.total).toBeGreaterThan(0);
    expect((await dbOrder(placed.number)).status).toBe("processing");
  });

  it("is for Pakistan only", async () => {
    const customer = await signUpCustomer();
    await addToCart(customer.cookie, await variantOf("S"), 1, "DE");
    const result = await call(createRoute, {
      cookie: customer.cookie,
      body: await orderBody(customer.cookie, "DE", "ada@example.com", "cod"),
    });
    expect(result.status).toBe(400);
    expect(result.body.error.fields.paymentMethod).toBeDefined();
  });

  it("is marked paid by staff when the cash is collected", async () => {
    const placed = await placeTestOrder({ paymentMethod: "cod" });
    const staff = await checker();

    const detail = (await adminOrder(staff.cookie, placed.number)).status;
    // "payments.verify" alone cannot read orders; confirming is a separate permission.
    expect(detail).toBe(403);

    const done = await confirm(staff.cookie, placed.number, {
      note: "Rider Ali, receipt 55",
    });
    expect(done.status).toBe(200);
    expect(done.body.order).toMatchObject({
      status: "processing",
      paymentStatus: "paid",
      paymentActions: { canConfirm: false, canReject: false },
    });
    expect(done.body.order.paidAt).toEqual(expect.any(String));
    expect(done.body.order.payments[0].status).toBe("succeeded");
    expect(done.body.order.history.at(-1).note).toBe(
      "Cash collected: Rider Ali, receipt 55",
    );

    expect((await myOrder(placed)).body.order.paymentStatus).toBe("paid");
    // Marking it twice is refused, not repeated.
    const again = await confirm(staff.cookie, placed.number);
    expect(again.status).toBe(409);
  });

  it("can be marked paid at any point after it was placed, and then refunded", async () => {
    const placed = await placeTestOrder({ paymentMethod: "cod" });
    const staff = await signedInStaff({
      permissions: [
        "orders.view",
        "orders.manage",
        "orders.refund",
        "payments.verify",
      ],
    });

    const shipped = await call(statusRoute, {
      staffCookie: staff.cookie,
      params: { number: placed.number },
      body: { status: "in_delivery" },
    });
    expect(shipped.status).toBe(200);
    expect(shipped.body.order.paymentStatus).toBe("pending");
    expect(shipped.body.order.paymentActions.canConfirm).toBe(true);

    expect((await confirm(staff.cookie, placed.number)).status).toBe(200);
    const refunded = await call(refundRoute, {
      staffCookie: staff.cookie,
      params: { number: placed.number },
      body: {
        amount: placed.total,
        reason: "Customer returned it",
        restock: true,
      },
    });
    expect(refunded.status).toBe(201);
    expect(refunded.body.order.paymentStatus).toBe("refunded");
  });

  it("is refused to staff without the permission, and to nobody-at-all", async () => {
    const placed = await placeTestOrder({ paymentMethod: "cod" });
    expect((await confirm(undefined, placed.number)).status).toBe(401);

    const other = await signedInStaff({
      permissions: ["orders.view", "orders.manage", "orders.refund"],
    });
    const refused = await confirm(other.cookie, placed.number);
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe("forbidden");
    expect((await dbOrder(placed.number)).payment_status).toBe("pending");
  });

  it("can be cancelled by staff while unpaid (a fake order), and the goods go back on the shelf", async () => {
    const before = await stockOf(await variantOf("S"));
    const placed = await placeTestOrder({
      paymentMethod: "cod",
      quantity: 3,
    });
    expect((await stockOf(placed.variantId)).on_hand).toBe(before.on_hand - 3);

    const staff = await manager();
    const detail = await adminOrder(staff.cookie, placed.number);
    expect(detail.body.order.allowedNextStatuses.sort()).toEqual([
      "cancelled",
      "in_delivery",
    ]);

    const cancelled = await call(statusRoute, {
      staffCookie: staff.cookie,
      params: { number: placed.number },
      body: { status: "cancelled", reason: "Phone number is fake" },
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.order).toMatchObject({
      status: "cancelled",
      stockState: "released",
      cancelReason: "Phone number is fake",
    });

    const stock = await stockOf(placed.variantId);
    expect(stock.on_hand).toBe(before.on_hand);
    expect(stock.reserved).toBe(before.reserved);
    const [movement] = await sql<{ delta: number; reason: string }>(
      `SELECT m.delta, m.reason FROM stock_movements m JOIN orders o ON o.id = m.order_id
       WHERE o.number = :number AND m.reason = 'return'`,
      { number: placed.number },
    );
    expect(movement).toEqual({ delta: 3, reason: "return" });
    expect(sent.at(-1)?.subject).toContain("was cancelled");
  });

  it("can be cancelled while on its way (refused at the door), but not once paid", async () => {
    const staff = await signedInStaff({
      permissions: ["orders.view", "orders.manage", "payments.verify"],
    });

    const onItsWay = await placeTestOrder({ paymentMethod: "cod" });
    await call(statusRoute, {
      staffCookie: staff.cookie,
      params: { number: onItsWay.number },
      body: { status: "in_delivery" },
    });
    const refusedAtDoor = await call(statusRoute, {
      staffCookie: staff.cookie,
      params: { number: onItsWay.number },
      body: { status: "cancelled", reason: "Refused at the door" },
    });
    expect(refusedAtDoor.status).toBe(200);
    expect(refusedAtDoor.body.order.status).toBe("cancelled");

    const paid = await placeTestOrder({ paymentMethod: "cod" });
    await confirm(staff.cookie, paid.number);
    const refused = await call(statusRoute, {
      staffCookie: staff.cookie,
      params: { number: paid.number },
      body: { status: "cancelled" },
    });
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("invalid_status_transition");
    expect((await dbOrder(paid.number)).status).toBe("processing");
  });

  it("cannot be cancelled by the customer once placed", async () => {
    const placed = await placeTestOrder({ paymentMethod: "cod" });
    const result = await call(cancelRoute, {
      cookie: placed.customer.cookie,
      params: { number: placed.number },
    });
    expect(result.status).toBe(409);
    expect((await dbOrder(placed.number)).status).toBe("processing");
  });

  it("counts as revenue only once the cash is collected", async () => {
    const placed = await placeTestOrder({ paymentMethod: "cod" });
    const boss = await signedInStaff({ superAdmin: true });
    const revenue = async () =>
      (
        await call(dashboardRoute, {
          method: "GET",
          staffCookie: boss.cookie,
          path: "/api/v1/admin/dashboard?market=PK",
        })
      ).body.markets.PK;

    const beforeCash = await revenue();
    expect(beforeCash.paid.amount).toBe(0);
    expect(beforeCash.awaitingShipment).toBe(1);

    await confirm(boss.cookie, placed.number);
    expect((await revenue()).paid).toEqual({ orders: 1, amount: placed.total });
  });
});

// ------------------------------------------------------- bank and wallets

describe.each([
  ["bank_transfer", "bank"],
  ["easypaisa", "Easypaisa"],
  ["jazzcash", "JazzCash"],
])("paying by %s", (method) => {
  it("holds the stock for the long transfer time while it waits", async () => {
    const before = await stockOf(await variantOf("S"));
    const placed = await placeTestOrder({ paymentMethod: method });
    const order = (await myOrder(placed)).body.order;

    expect(order).toMatchObject({
      status: "waiting_payment",
      paymentStatus: "pending",
      paymentMethod: method,
      paymentProvider: "manual",
      paymentProof: null,
    });
    const hours =
      (new Date(order.reservationExpiresAt).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(47.5);
    expect(hours).toBeLessThanOrEqual(48);

    const stock = await stockOf(placed.variantId);
    expect(stock.reserved).toBe(before.reserved + 1);
    expect(stock.on_hand).toBe(before.on_hand);
  });

  it("is not offered when its account details are not set", async () => {
    await exec("UPDATE shop_settings SET payment_details = '{}'::jsonb");
    const customer = await signUpCustomer();
    await addToCart(customer.cookie, await variantOf("S"), 1, "PK");
    const result = await call(createRoute, {
      cookie: customer.cookie,
      body: await orderBody(customer.cookie, "PK", "ada@example.com", method),
    });
    expect(result.status).toBe(400);
    expect(result.body.error.fields.paymentMethod).toBeDefined();
    // Nothing was held for the refused order.
    expect((await stockOf(await variantOf("S"))).reserved).toBe(0);
  });
});

describe("sending a payment proof", () => {
  it("waits for staff after a transaction ID, and stops the clock", async () => {
    const placed = await placeTestOrder({ paymentMethod: "easypaisa" });
    const result = await sendProof(placed, { transactionId: nextTid() });

    expect(result.status).toBe(200);
    expect(result.body.order).toMatchObject({
      status: "waiting_payment",
      paymentStatus: "awaiting_verification",
      reservationExpiresAt: null,
      paymentProof: { status: "pending", rejectionReason: null },
    });
    const row = await dbOrder(placed.number);
    expect(row.reservation_expires_at).toBeNull();

    // It must not run out of time while staff look at it.
    await releaseExpiredReservations();
    expect((await dbOrder(placed.number)).status).toBe("waiting_payment");
    expect((await stockOf(placed.variantId)).reserved).toBe(1);
  });

  it("keeps the screenshot private, as a WebP", async () => {
    const placed = await placeTestOrder({ paymentMethod: "bank_transfer" });
    const result = await sendProof(placed, {
      transactionId: nextTid(),
      screenshot: await picture(3000, 2000),
    });
    expect(result.status).toBe(200);

    const staff = await signedInStaff({
      permissions: ["orders.view", "payments.verify"],
    });
    const detail = await adminOrder(staff.cookie, placed.number);
    const [proof] = detail.body.order.paymentProofs;
    expect(proof).toMatchObject({
      hasScreenshot: true,
      status: "pending",
      reviewedAt: null,
    });

    const shot = await call(screenshotRoute, {
      method: "GET",
      staffCookie: staff.cookie,
      params: { number: placed.number, proofId: proof.id },
    });
    expect(shot.status).toBe(200);
    expect(shot.headers.get("content-type")).toBe("image/webp");
    expect(shot.headers.get("cache-control")).toBe("private, no-store");
    expect(await sharp(shot.bytes).metadata()).toMatchObject({
      format: "webp",
      width: 2000,
      height: 1333,
    });

    // Not reachable through the public photo address, and not by staff without the permission.
    const [file] = await sql<{ file_key: string }>(
      "SELECT file_key FROM payment_proofs WHERE id = :id",
      { id: proof.id },
    );
    expect(file.file_key).toMatch(/^payment-proofs\/[0-9a-f]{32}\.webp$/);
    const publicTry = await call(mediaRoute, {
      method: "GET",
      params: { file: file.file_key.replace("payment-proofs/", "") },
    });
    expect(publicTry.status).toBe(404);

    const orderOnly = await viewer();
    expect(
      (
        await call(screenshotRoute, {
          method: "GET",
          staffCookie: orderOnly.cookie,
          params: { number: placed.number, proofId: proof.id },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call(screenshotRoute, {
          method: "GET",
          params: { number: placed.number, proofId: proof.id },
        })
      ).status,
    ).toBe(401);
  });

  it("is accepted with a screenshot alone", async () => {
    const placed = await placeTestOrder({ paymentMethod: "jazzcash" });
    const result = await sendProof(placed, {
      screenshot: await picture(),
    });
    expect(result.status).toBe(200);
    expect(result.body.order.paymentStatus).toBe("awaiting_verification");
  });

  it("needs a transaction ID or a screenshot, and checks both", async () => {
    const placed = await placeTestOrder({ paymentMethod: "bank_transfer" });

    const empty = await sendProof(placed, {});
    expect(empty.status).toBe(400);
    expect(empty.body.error.fields.transactionId).toBeDefined();

    const bad = await sendProof(placed, { transactionId: "<script>" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields.transactionId).toBeDefined();
    expect((await sendProof(placed, { transactionId: "ab" })).status).toBe(400);

    const notAnImage = await sendProof(placed, {
      screenshot: Buffer.from("this is not a picture"),
    });
    expect(notAnImage.status).toBe(400);
    expect(notAnImage.body.error.fields.screenshot).toBeDefined();

    // Nothing was saved by the refused attempts.
    expect((await dbOrder(placed.number)).payment_status).toBe("pending");
    const [count] = await sql<{ n: number }>(
      "SELECT count(*)::int AS n FROM payment_proofs",
    );
    expect(count.n).toBe(0);
    expect(await storage.get("payment-proofs/none.webp")).toBeNull();
  });

  it("is refused for another customer's order, a card order, a cash order and a plain request", async () => {
    const placed = await placeTestOrder({ paymentMethod: "bank_transfer" });
    const stranger = await signUpCustomer();
    expect(
      (
        await call(proofRoute, {
          cookie: stranger.cookie,
          params: { number: placed.number },
          form: proofForm({ transactionId: nextTid() }),
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call(proofRoute, {
          params: { number: placed.number },
          form: proofForm({ transactionId: nextTid() }),
        })
      ).status,
    ).toBe(401);

    const card = await placeTestOrder({ paymentMethod: "card" });
    expect((await sendProof(card, { transactionId: nextTid() })).status).toBe(
      409,
    );
    const cash = await placeTestOrder({ paymentMethod: "cod" });
    expect((await sendProof(cash, { transactionId: nextTid() })).status).toBe(
      409,
    );

    const json = await call(proofRoute, {
      cookie: placed.customer.cookie,
      params: { number: placed.number },
      body: { transactionId: nextTid() },
    });
    expect(json.status).toBe(415);
  });

  it("is refused a second time while staff are checking, and after the order was cancelled or timed out", async () => {
    const placed = await placeTestOrder({ paymentMethod: "bank_transfer" });
    expect((await sendProof(placed, { transactionId: nextTid() })).status).toBe(
      200,
    );
    const twice = await sendProof(placed, { transactionId: nextTid() });
    expect(twice.status).toBe(409);

    const late = await placeTestOrder({ paymentMethod: "bank_transfer" });
    await exec(
      "UPDATE orders SET reservation_expires_at = now() - interval '1 minute' WHERE number = :number",
      { number: late.number },
    );
    const tooLate = await sendProof(late, { transactionId: nextTid() });
    expect(tooLate.status).toBe(409);
    expect((await dbOrder(late.number)).status).toBe("cancelled");
    expect((await stockOf(late.variantId)).reserved).toBe(1);
  });

  it("does not let one transaction ID pay two orders", async () => {
    const first = await placeTestOrder({ paymentMethod: "jazzcash" });
    const second = await placeTestOrder({ paymentMethod: "jazzcash" });
    const id = nextTid();

    expect((await sendProof(first, { transactionId: id })).status).toBe(200);
    const reused = await sendProof(second, {
      transactionId: id.toLowerCase(),
    });
    expect(reused.status).toBe(409);
    expect(reused.body.error.fields.transactionId).toBeDefined();
    expect((await dbOrder(second.number)).payment_status).toBe("pending");
  });

  it("stops the customer from cancelling an order that is being checked", async () => {
    const placed = await placeTestOrder({ paymentMethod: "bank_transfer" });
    await sendProof(placed, { transactionId: nextTid() });

    const result = await call(cancelRoute, {
      cookie: placed.customer.cookie,
      params: { number: placed.number },
    });
    expect(result.status).toBe(409);
    expect((await dbOrder(placed.number)).status).toBe("waiting_payment");
  });

  it("shows up on the dashboard until it is decided", async () => {
    const boss = await signedInStaff({ superAdmin: true });
    const waiting = async () =>
      (
        await call(dashboardRoute, {
          method: "GET",
          staffCookie: boss.cookie,
          path: "/api/v1/admin/dashboard?market=PK",
        })
      ).body.markets.PK.awaitingVerification;

    const placed = await placeTestOrder({ paymentMethod: "easypaisa" });
    expect(await waiting()).toBe(0);
    await sendProof(placed, { transactionId: nextTid() });
    expect(await waiting()).toBe(1);
    await confirm(boss.cookie, placed.number);
    expect(await waiting()).toBe(0);
  });
});

describe("checking a payment", () => {
  it("confirming sells the stock, starts processing and tells the customer", async () => {
    const before = await stockOf(await variantOf("S"));
    const placed = await placeTestOrder({
      paymentMethod: "bank_transfer",
      email: "buyer@example.com",
    });
    await sendProof(placed, {
      transactionId: nextTid(),
      screenshot: await picture(),
    });
    const staff = await signedInStaff({
      permissions: ["orders.view", "payments.verify"],
    });

    const before1 = await adminOrder(staff.cookie, placed.number);
    expect(before1.body.order.paymentActions).toEqual({
      canConfirm: true,
      canReject: true,
    });

    const result = await confirm(staff.cookie, placed.number, {
      note: "Seen in the Meezan app",
    });
    expect(result.status).toBe(200);
    expect(result.body.order).toMatchObject({
      status: "processing",
      paymentStatus: "paid",
      stockState: "committed",
      paymentActions: { canConfirm: false, canReject: false },
    });
    expect(result.body.order.paymentProofs[0]).toMatchObject({
      status: "approved",
      reviewNote: "Seen in the Meezan app",
      reviewedBy: { id: staff.id },
    });
    expect(result.body.order.history.at(-1)).toMatchObject({
      to: "processing",
      actorType: "staff",
      actor: { id: staff.id },
      note: "Payment confirmed: Seen in the Meezan app",
    });
    expect(result.body.order.payments.at(-1).status).toBe("succeeded");

    const stock = await stockOf(placed.variantId);
    expect(stock.on_hand).toBe(before.on_hand - 1);
    expect(stock.reserved).toBe(before.reserved);

    const mine = (await myOrder(placed)).body.order;
    expect(mine).toMatchObject({
      status: "processing",
      paymentStatus: "paid",
      paymentProof: { status: "approved" },
    });
    expect(sent.at(-1)).toMatchObject({ to: "buyer@example.com" });
    expect(sent.at(-1)?.subject).toContain("received your payment");
  });

  it("can confirm an order whose customer paid but sent no proof", async () => {
    const placed = await placeTestOrder({ paymentMethod: "jazzcash" });
    const staff = await checker();
    const result = await confirm(staff.cookie, placed.number);

    expect(result.status).toBe(200);
    expect(result.body.order.status).toBe("processing");
    expect(result.body.order.paymentProofs).toEqual([]);
  });

  it("rejecting tells the customer why, keeps the stock and lets them try again", async () => {
    const placed = await placeTestOrder({
      paymentMethod: "easypaisa",
      email: "buyer@example.com",
    });
    await sendProof(placed, { transactionId: nextTid() });
    const staff = await checker();

    const rejected = await reject(staff.cookie, placed.number, {
      reason: "The amount does not match",
    });
    expect(rejected.status).toBe(200);
    expect(rejected.body.order).toMatchObject({
      status: "waiting_payment",
      paymentStatus: "failed",
      paymentActions: { canConfirm: true, canReject: false },
    });
    expect(rejected.body.order.paymentProofs[0]).toMatchObject({
      status: "rejected",
      reviewNote: "The amount does not match",
    });
    expect(sent.at(-1)?.text).toContain("The amount does not match");

    // The customer sees what to fix, and the order has time again.
    const mine = (await myOrder(placed)).body.order;
    expect(mine.paymentStatus).toBe("failed");
    expect(mine.paymentProof).toMatchObject({
      status: "rejected",
      rejectionReason: "The amount does not match",
    });
    expect(new Date(mine.reservationExpiresAt).getTime()).toBeGreaterThan(
      Date.now() + 47 * 3_600_000,
    );
    expect((await stockOf(placed.variantId)).reserved).toBe(1);

    // They send another proof (a new payment attempt), and staff approve it.
    const again = await sendProof(placed, { transactionId: nextTid() });
    expect(again.status).toBe(200);
    expect(again.body.order.paymentStatus).toBe("awaiting_verification");
    const payments = (
      await adminOrder(
        (await signedInStaff({ permissions: ["orders.view"] })).cookie,
        placed.number,
      )
    ).body.order.payments;
    expect(payments.map((p: { status: string }) => p.status)).toEqual([
      "failed",
      "pending",
    ]);

    const approved = await confirm(staff.cookie, placed.number);
    expect(approved.status).toBe(200);
    expect(approved.body.order.paymentStatus).toBe("paid");
    expect(
      approved.body.order.paymentProofs.map(
        (p: { status: string }) => p.status,
      ),
    ).toEqual(["rejected", "approved"]);
  });

  it("lets a rejected proof's transaction ID be used again", async () => {
    const first = await placeTestOrder({ paymentMethod: "bank_transfer" });
    const id = nextTid();
    await sendProof(first, { transactionId: id });
    const staff = await checker();
    await reject(staff.cookie, first.number, { reason: "Not found" });

    const second = await placeTestOrder({ paymentMethod: "bank_transfer" });
    expect((await sendProof(second, { transactionId: id })).status).toBe(200);
  });

  it("stops after too many proofs for one order", async () => {
    const placed = await placeTestOrder({ paymentMethod: "bank_transfer" });
    const staff = await checker();
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(
        (await sendProof(placed, { transactionId: nextTid() })).status,
      ).toBe(200);
      await reject(staff.cookie, placed.number, { reason: "Wrong" });
    }
    const sixth = await sendProof(placed, { transactionId: nextTid() });
    expect(sixth.status).toBe(409);
  });

  it("refuses to reject when no proof is waiting, and to confirm a card or a cancelled order", async () => {
    const staff = await checker();

    const noProof = await placeTestOrder({ paymentMethod: "bank_transfer" });
    expect(
      (await reject(staff.cookie, noProof.number, { reason: "No" })).status,
    ).toBe(409);

    const card = await placeTestOrder({ paymentMethod: "card" });
    const cardTry = await confirm(staff.cookie, card.number);
    expect(cardTry.status).toBe(409);
    expect(cardTry.body.error.message).toContain("automatically");

    const cancelled = await placeTestOrder({ paymentMethod: "bank_transfer" });
    await call(cancelRoute, {
      cookie: cancelled.customer.cookie,
      params: { number: cancelled.number },
    });
    expect((await confirm(staff.cookie, cancelled.number)).status).toBe(409);
    expect((await dbOrder(cancelled.number)).status).toBe("cancelled");

    expect(
      (await reject(staff.cookie, "LZ-PK-999999", { reason: "No" })).status,
    ).toBe(404);
    expect((await confirm(staff.cookie, "nonsense")).status).toBe(404);
  });

  it("validates the rejection reason", async () => {
    const placed = await placeTestOrder({ paymentMethod: "bank_transfer" });
    await sendProof(placed, { transactionId: nextTid() });
    const staff = await checker();
    for (const body of [
      {},
      { reason: "" },
      { reason: "x".repeat(301) },
      { reason: "ok", extra: 1 },
    ]) {
      expect(
        (await reject(staff.cookie, placed.number, body)).status,
        JSON.stringify(body),
      ).toBe(400);
    }
  });

  it("needs the payments.verify permission to confirm or reject", async () => {
    const placed = await placeTestOrder({ paymentMethod: "bank_transfer" });
    await sendProof(placed, { transactionId: nextTid() });
    const other = await signedInStaff({
      permissions: ["orders.view", "orders.manage", "orders.refund"],
    });

    expect((await confirm(other.cookie, placed.number)).status).toBe(403);
    expect(
      (await reject(other.cookie, placed.number, { reason: "No" })).status,
    ).toBe(403);
    expect((await dbOrder(placed.number)).payment_status).toBe(
      "awaiting_verification",
    );
  });

  it("is written to the audit log", async () => {
    const placed = await placeTestOrder({ paymentMethod: "easypaisa" });
    await sendProof(placed, { transactionId: nextTid() });
    const staff = await checker();
    await reject(staff.cookie, placed.number, { reason: "Blurry" });
    await confirm(staff.cookie, placed.number);

    const rows = await sql<{ action: string; staff_id: string }>(
      `SELECT action, staff_id FROM audit_log WHERE entity_id = :number ORDER BY at, id`,
      { number: placed.number },
    );
    expect(rows).toEqual([
      { action: "orders.payment_reject", staff_id: staff.id },
      { action: "orders.payment_confirm", staff_id: staff.id },
    ]);
  });
});

describe("an unpaid transfer order", () => {
  it("is cancelled and its stock freed when the customer never pays", async () => {
    const placed = await placeTestOrder({ paymentMethod: "bank_transfer" });
    await exec(
      "UPDATE orders SET reservation_expires_at = now() - interval '1 minute' WHERE number = :number",
      { number: placed.number },
    );

    expect(await releaseExpiredReservations()).toBe(1);
    expect((await dbOrder(placed.number)).status).toBe("cancelled");
    expect((await stockOf(placed.variantId)).reserved).toBe(0);
  });

  it("can be cancelled by staff while nobody has paid it", async () => {
    const placed = await placeTestOrder({ paymentMethod: "jazzcash" });
    const staff = await manager();
    const result = await call(statusRoute, {
      staffCookie: staff.cookie,
      params: { number: placed.number },
      body: { status: "cancelled", reason: "Customer asked" },
    });
    expect(result.status).toBe(200);
    expect(result.body.order.status).toBe("cancelled");
    expect((await stockOf(placed.variantId)).reserved).toBe(0);
  });
});
