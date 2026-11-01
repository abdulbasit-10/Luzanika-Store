import { execFileSync } from "node:child_process";

import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DELETE as deleteAccount } from "@/app/api/v1/account/route";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { GET as getCartRoute } from "@/app/api/v1/cart/route";
import { POST as addRoute } from "@/app/api/v1/cart/items/route";
import { PATCH as patchCartRoute } from "@/app/api/v1/cart/items/[variantId]/route";
import {
  GET as listRoute,
  POST as createRoute,
} from "@/app/api/v1/orders/route";
import { GET as getRoute } from "@/app/api/v1/orders/[number]/route";
import { POST as cancelRoute } from "@/app/api/v1/orders/[number]/cancel/route";
import { POST as simulateRoute } from "@/app/api/v1/orders/[number]/simulate-payment/route";
import { importSampleCatalog } from "@/server/catalog/import-sample-catalog";

import { call, exec, newIp, sql, uniqueEmail } from "./helpers";

const PASSWORD = "Sup3r-secret-pw";
const SLUG = "elegant-satin-midi-dress";

type Market = "PK" | "DE";

async function signUp() {
  const result = await call(register, {
    body: {
      firstName: "Ada",
      lastName: "Lovelace",
      email: uniqueEmail(),
      password: PASSWORD,
    },
  });
  return { cookie: result.cookie as string, id: result.body.user.id as string };
}

async function variantOf(size: string, slug = SLUG) {
  const [row] = await sql<{ id: string }>(
    `SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id
     WHERE p.slug = :slug AND v.size_label = :size AND v.color_name = 'Green'`,
    { slug, size },
  );
  return row.id;
}

const addToCart = (
  cookie: string,
  variantId: string,
  quantity = 1,
  market: Market = "PK",
) =>
  call(addRoute, {
    method: "POST",
    cookie,
    body: { variantId, quantity, market },
  });

const getCart = (cookie: string, market: Market = "PK") =>
  call(getCartRoute, {
    method: "GET",
    cookie,
    path: `/api/v1/cart?market=${market}`,
  });

const shipping = {
  fullName: "Ada Lovelace",
  country: "Pakistan",
  city: "Lahore",
  address: "MM Alam Road 5",
  zip: "54000",
};

interface CartLineBody {
  variantId: string;
  quantity: number;
  selected: boolean;
  unitPrice: { amount: number };
}

/** What the website would send: the order details plus what the shopper saw in the cart. */
async function orderBody(
  cookie: string,
  market: Market = "PK",
  overrides: Record<string, unknown> = {},
) {
  const lines = ((await getCart(cookie, market)).body.items as CartLineBody[])
    .filter((line) => line.selected)
    .map((line) => ({
      variantId: line.variantId,
      quantity: line.quantity,
      amount: line.unitPrice.amount,
    }));
  return {
    market,
    contact: { email: "ada@example.com", phone: "+92 300 1234567" },
    shipping,
    billing: "same",
    paymentMethod: "card",
    acceptTerms: true,
    expected: {
      total: lines.reduce((sum, line) => sum + line.amount * line.quantity, 0),
      items: lines.map(({ variantId, quantity }) => ({ variantId, quantity })),
    },
    ...overrides,
  };
}

const placeWith = (cookie: string | undefined, body: unknown, key?: string) =>
  call(createRoute, {
    method: "POST",
    cookie,
    body,
    headers: key ? { "idempotency-key": key } : undefined,
  });

async function place(
  cookie: string,
  market: Market = "PK",
  overrides: Record<string, unknown> = {},
  key?: string,
) {
  return placeWith(cookie, await orderBody(cookie, market, overrides), key);
}

const list = (cookie: string | undefined) =>
  call(listRoute, { method: "GET", cookie });
const getOrder = (cookie: string | undefined, number: string) =>
  call(getRoute, { method: "GET", cookie, params: { number } });
const cancel = (cookie: string | undefined, number: string) =>
  call(cancelRoute, { method: "POST", cookie, params: { number } });
const simulate = (
  cookie: string | undefined,
  number: string,
  outcome: "success" | "failure" = "success",
) =>
  call(simulateRoute, {
    method: "POST",
    cookie,
    params: { number },
    body: { outcome },
  });

interface Stock {
  on_hand: number;
  reserved: number;
}
async function stockOf(variantId: string, market: Market = "PK") {
  const [row] = await sql<Stock>(
    "SELECT on_hand, reserved FROM inventory WHERE variant_id = :variantId AND market = :market",
    { variantId, market },
  );
  return row;
}
const setStock = (variantId: string, onHand: number, market: Market = "PK") =>
  exec(
    "UPDATE inventory SET on_hand = :onHand, reserved = 0 WHERE variant_id = :variantId AND market = :market",
    { variantId, market, onHand },
  );

let pool: pg.Pool;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  await importSampleCatalog(pool);
});

afterAll(async () => {
  await pool.end();
});

// Every test starts from the freshly imported catalogue, with no orders holding stock.
beforeEach(async () => {
  await exec("DELETE FROM stock_movements WHERE reason = 'sale'");
  await exec("DELETE FROM orders");
  await exec("UPDATE inventory SET on_hand = 25, reserved = 0");
  await exec("UPDATE product_variants SET active = true");
  await exec("UPDATE products SET status = 'active', deleted_at = NULL");
  await exec(
    "UPDATE product_prices SET amount = 89000 WHERE product_id = (SELECT id FROM products WHERE slug = :slug)",
    { slug: SLUG },
  );
});

describe("authentication", () => {
  it("every order endpoint needs a signed-in customer", async () => {
    const results = await Promise.all([
      list(undefined),
      placeWith(undefined, {}),
      getOrder(undefined, "LZ-PK-000001"),
      cancel(undefined, "LZ-PK-000001"),
      simulate(undefined, "LZ-PK-000001"),
    ]);
    for (const result of results) {
      expect(result.status).toBe(401);
      expect(result.body.error.code).toBe("unauthenticated");
    }
  });
});

describe("placing an order", () => {
  it("makes an order from the ticked cart lines, priced by the server, and holds the stock", async () => {
    const { cookie } = await signUp();
    const small = await variantOf("S");
    const medium = await variantOf("M");
    await addToCart(cookie, small, 2);
    await addToCart(cookie, medium, 1);

    const result = await place(cookie);

    expect(result.status).toBe(201);
    const { order, payment } = result.body;
    expect(order.number).toMatch(/^LZ-PK-\d{6}$/);
    expect(result.headers.get("location")).toBe(
      `/api/v1/orders/${order.number}`,
    );
    expect(order).toMatchObject({
      market: "PK",
      currency: "PKR",
      status: "waiting_payment",
      paymentStatus: "pending",
      paymentMethod: "card",
      subtotal: 89000 * 3,
      shippingTotal: 0,
      taxTotal: 0,
      discountTotal: 0,
      total: 89000 * 3,
      email: "ada@example.com",
      shipping: { name: "Ada Lovelace", city: "Lahore" },
      billing: null,
    });
    expect(order.items).toHaveLength(2);
    expect(order.items[0]).toMatchObject({
      slug: SLUG,
      name: "Elegant Satin Midi Dress",
      size: "S",
      color: "Green",
      quantity: 2,
      unitAmount: 89000,
      lineTotal: 178000,
    });
    expect(payment).toEqual({ provider: "simulated" });

    // The time to pay is about 30 minutes.
    const minutes =
      (Date.parse(order.reservationExpiresAt) - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(28);
    expect(minutes).toBeLessThanOrEqual(30);

    // Stock is held, not sold yet.
    expect(await stockOf(small)).toEqual({ on_hand: 25, reserved: 2 });
    expect(await stockOf(medium)).toEqual({ on_hand: 25, reserved: 1 });

    // What was ordered left the cart.
    expect((await getCart(cookie)).body.items).toEqual([]);

    const [paymentRow] = await sql<{
      provider: string;
      status: string;
      amount: string;
      provider_ref: string;
    }>(
      "SELECT provider, status, amount, provider_ref FROM payments WHERE order_id = (SELECT id FROM orders WHERE number = :number)",
      { number: order.number },
    );
    expect(paymentRow).toMatchObject({
      provider: "simulated",
      status: "pending",
      amount: String(89000 * 3),
    });
    expect(paymentRow.provider_ref).toMatch(/^sim_/);

    const history = await sql<{
      from_status: string | null;
      to_status: string;
      actor_type: string;
    }>(
      "SELECT from_status, to_status, actor_type FROM order_status_history WHERE order_id = (SELECT id FROM orders WHERE number = :number)",
      { number: order.number },
    );
    expect(history).toEqual([
      {
        from_status: null,
        to_status: "waiting_payment",
        actor_type: "customer",
      },
    ]);
  });

  it("lists the items in the order they were in the cart, every time", async () => {
    const { cookie } = await signUp();
    for (const size of ["L", "S", "M", "XL"]) {
      await addToCart(cookie, await variantOf(size));
    }

    const { number } = (await place(cookie)).body.order;

    for (let read = 0; read < 3; read++) {
      const order = (await getOrder(cookie, number)).body.order;
      expect(order.items.map((item: { size: string }) => item.size)).toEqual([
        "L",
        "S",
        "M",
        "XL",
      ]);
    }
  });
  it("only orders the ticked lines and leaves the rest in the cart", async () => {
    const { cookie } = await signUp();
    const small = await variantOf("S");
    const medium = await variantOf("M");
    await addToCart(cookie, small);
    await addToCart(cookie, medium);
    await call(patchCartRoute, {
      method: "PATCH",
      cookie,
      params: { variantId: medium },
      body: { market: "PK", selected: false },
    });

    const result = await place(cookie);

    expect(result.body.order.items).toHaveLength(1);
    expect(result.body.order.items[0].size).toBe("S");
    const left = (await getCart(cookie)).body.items;
    expect(left).toHaveLength(1);
    expect(left[0].variantId).toBe(medium);
    expect(await stockOf(medium)).toEqual({ on_hand: 25, reserved: 0 });
  });

  it("numbers orders one by one in each market on their own", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    const numbers: string[] = [];
    for (const market of ["PK", "PK", "DE"] as const) {
      await addToCart(cookie, variant, 1, market);
      numbers.push((await place(cookie, market)).body.order.number);
    }

    const serial = (number: string) => Number(number.split("-")[2]);
    expect(numbers[0]).toMatch(/^LZ-PK-/);
    expect(serial(numbers[1])).toBe(serial(numbers[0]) + 1);
    expect(numbers[2]).toMatch(/^LZ-DE-/);
  });

  it("orders in euros for the German market, with its own stock", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 2, "DE");

    const { order } = (await place(cookie, "DE")).body;

    expect(order).toMatchObject({
      market: "DE",
      currency: "EUR",
      total: 178000,
    });
    expect(await stockOf(variant, "DE")).toEqual({ on_hand: 25, reserved: 2 });
    expect(await stockOf(variant, "PK")).toEqual({ on_hand: 25, reserved: 0 });
  });

  it("keeps a separate billing address when one is given", async () => {
    const { cookie } = await signUp();
    await addToCart(cookie, await variantOf("S"));

    const result = await place(cookie, "PK", {
      billing: {
        country: "Germany",
        city: "Berlin",
        address: "Unter den Linden 1",
        zip: "10117",
      },
    });

    expect(result.body.order.billing).toEqual({
      country: "Germany",
      city: "Berlin",
      address: "Unter den Linden 1",
      zip: "10117",
    });
  });

  it.each([
    ["terms not accepted", { acceptTerms: false }],
    ["unknown fields (a price from the browser)", { total: 1 }],
    ["a bad email", { contact: { email: "nope", phone: "+92 300 1234567" } }],
    ["a bad phone number", { contact: { email: "a@b.co", phone: "x" } }],
    ["a missing name", { shipping: { ...shipping, fullName: "" } }],
    ["a half-filled billing address", { billing: { country: "Germany" } }],
    ["an unknown market", { market: "FR" }],
    ["an unknown payment method", { paymentMethod: "bitcoin" }],
    ["nothing expected", { expected: { total: 0, items: [] } }],
  ])("rejects %s", async (_label, override) => {
    const { cookie } = await signUp();
    await addToCart(cookie, await variantOf("S"));

    const result = await place(cookie, "PK", override);

    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe("validation_failed");
    expect((await getCart(cookie)).body.items).toHaveLength(1);
  });

  it("refuses when nothing is ticked", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant);
    await call(patchCartRoute, {
      method: "PATCH",
      cookie,
      params: { variantId: variant },
      body: { market: "PK", selected: false },
    });

    const result = await placeWith(cookie, {
      ...(await orderBody(cookie)),
      expected: { total: 89000, items: [{ variantId: variant, quantity: 1 }] },
    });

    expect(result.status).toBe(422);
  });

  it("refuses an empty cart", async () => {
    const { cookie } = await signUp();
    const result = await placeWith(cookie, {
      ...(await orderBody(cookie)),
      expected: {
        total: 89000,
        items: [{ variantId: crypto.randomUUID(), quantity: 1 }],
      },
    });
    expect(result.status).toBe(422);
  });
});

describe("what the shopper saw must be what they pay", () => {
  it.each([
    [
      "a different total",
      (body: { expected: { total: number } }) => (body.expected.total -= 1),
    ],
    [
      "a different quantity",
      (body: { expected: { items: { quantity: number }[] } }) =>
        (body.expected.items[0].quantity += 1),
    ],
    [
      "an extra item",
      (body: { expected: { items: unknown[] } }) =>
        body.expected.items.push({
          variantId: crypto.randomUUID(),
          quantity: 1,
        }),
    ],
  ])("refuses %s and changes nothing", async (_label, tamper) => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 2);
    const body = await orderBody(cookie);
    tamper(body as never);

    const result = await placeWith(cookie, body);

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("cart_changed");
    expect(await stockOf(variant)).toEqual({ on_hand: 25, reserved: 0 });
    expect((await getCart(cookie)).body.items).toHaveLength(1);
    expect(await sql("SELECT 1 FROM orders")).toHaveLength(0);
  });

  it("refuses when the price changed after the cart was shown", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant);
    const body = await orderBody(cookie);
    await exec(
      "UPDATE product_prices SET amount = 99000 WHERE market = 'PK' AND product_id = (SELECT id FROM products WHERE slug = :slug)",
      { slug: SLUG },
    );

    const result = await placeWith(cookie, body);

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("cart_changed");
    // Seeing the new price, the shopper can order.
    expect((await place(cookie)).body.order.total).toBe(99000);
  });

  it("refuses when stock dropped below what the shopper saw", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 3);
    const body = await orderBody(cookie);
    await setStock(variant, 2);

    const result = await placeWith(cookie, body);

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("cart_changed");
    expect(await stockOf(variant)).toEqual({ on_hand: 2, reserved: 0 });
  });

  it("orders the lowered quantity when the shopper already saw it", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 5);
    await setStock(variant, 3);

    const result = await place(cookie);

    expect(result.status).toBe(201);
    expect(result.body.order.items[0].quantity).toBe(3);
    expect(await stockOf(variant)).toEqual({ on_hand: 3, reserved: 3 });
  });
});

describe("the last units", () => {
  it("never sells the last unit twice", async () => {
    const ada = await signUp();
    const bob = await signUp();
    const variant = await variantOf("S");
    await setStock(variant, 1);
    await addToCart(ada.cookie, variant);
    await addToCart(bob.cookie, variant);
    const bodies = [await orderBody(ada.cookie), await orderBody(bob.cookie)];

    const results = await Promise.all([
      placeWith(ada.cookie, bodies[0]),
      placeWith(bob.cookie, bodies[1]),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await stockOf(variant)).toEqual({ on_hand: 1, reserved: 1 });
  });

  it("hands out exactly the stock to a crowd of buyers", async () => {
    const variant = await variantOf("S");
    await setStock(variant, 3);
    const buyers = await Promise.all(Array.from({ length: 8 }, () => signUp()));
    // Carts do not hold stock, so every buyer can have the last units in their cart.
    for (const buyer of buyers) await addToCart(buyer.cookie, variant);
    const bodies = await Promise.all(
      buyers.map((buyer) => orderBody(buyer.cookie)),
    );

    const results = await Promise.all(
      buyers.map((buyer, index) => placeWith(buyer.cookie, bodies[index])),
    );

    expect(results.filter((result) => result.status === 201)).toHaveLength(3);
    expect(results.filter((result) => result.status === 409)).toHaveLength(5);
    expect(await stockOf(variant)).toEqual({ on_hand: 3, reserved: 3 });
  });

  it("does not let a held unit be bought, but frees it when the order is cancelled", async () => {
    const ada = await signUp();
    const bob = await signUp();
    const variant = await variantOf("S");
    await setStock(variant, 1);
    await addToCart(ada.cookie, variant);
    const held = (await place(ada.cookie)).body.order;

    // Bob cannot even add it: the unit is held for Ada.
    expect((await addToCart(bob.cookie, variant)).status).toBe(409);

    await cancel(ada.cookie, held.number);
    expect((await addToCart(bob.cookie, variant)).status).toBe(201);
    expect((await place(bob.cookie)).status).toBe(201);
  });
});

describe("a double click or a retry never makes two orders", () => {
  it("returns the same order for the same key", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 2);
    const body = await orderBody(cookie);

    const first = await placeWith(cookie, body, "checkout-attempt-0001");
    const second = await placeWith(cookie, body, "checkout-attempt-0001");

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.order.number).toBe(first.body.order.number);
    expect(await sql("SELECT 1 FROM orders")).toHaveLength(1);
    expect(await stockOf(variant)).toEqual({ on_hand: 25, reserved: 2 });
  });

  it("holds when the same key arrives at the same moment", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 2);
    const body = await orderBody(cookie);

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        placeWith(cookie, body, "checkout-attempt-0002"),
      ),
    );

    expect(
      new Set(results.map((result) => result.body.order.number)).size,
    ).toBe(1);
    expect(await sql("SELECT 1 FROM orders")).toHaveLength(1);
    expect(await stockOf(variant)).toEqual({ on_hand: 25, reserved: 2 });
  });

  it("gives another customer their own order for the same key", async () => {
    const ada = await signUp();
    const bob = await signUp();
    const variant = await variantOf("S");
    await addToCart(ada.cookie, variant);
    await addToCart(bob.cookie, variant);

    const first = await place(ada.cookie, "PK", {}, "shared-key-000001");
    const second = await place(bob.cookie, "PK", {}, "shared-key-000001");

    expect(first.body.order.number).not.toBe(second.body.order.number);
  });

  it.each(["short", "has spaces in it", "bad/char/here", "x".repeat(101)])(
    "rejects the key %j",
    async (key) => {
      const { cookie } = await signUp();
      await addToCart(cookie, await variantOf("S"));

      const result = await place(cookie, "PK", {}, key);

      expect(result.status).toBe(400);
    },
  );
});

describe("seeing orders", () => {
  it("lists the customer's orders, newest first, and fetches one", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant);
    const first = (await place(cookie)).body.order;
    await addToCart(cookie, variant, 2);
    const second = (await place(cookie)).body.order;

    const listed = await list(cookie);
    expect(listed.status).toBe(200);
    expect(
      listed.body.items.map((order: { number: string }) => order.number),
    ).toEqual([second.number, first.number]);

    const one = await getOrder(cookie, first.number);
    expect(one.body.order).toMatchObject({
      number: first.number,
      total: 89000,
    });
    expect(one.body.order.items[0].name).toBe("Elegant Satin Midi Dress");
  });

  it("never shows another customer's order", async () => {
    const ada = await signUp();
    const bob = await signUp();
    await addToCart(ada.cookie, await variantOf("S"));
    const { number } = (await place(ada.cookie)).body.order;

    expect((await list(bob.cookie)).body.items).toEqual([]);
    expect((await getOrder(bob.cookie, number)).status).toBe(404);
    expect((await cancel(bob.cookie, number)).status).toBe(404);
    expect((await simulate(bob.cookie, number)).status).toBe(404);
    expect((await getOrder(ada.cookie, number)).status).toBe(200);
  });

  it.each(["nope", "LZ-XX-000001", "lz-pk-000001", "LZ-PK-1", "../etc"])(
    "answers 404 for the order number %j",
    async (number) => {
      const { cookie } = await signUp();
      expect((await getOrder(cookie, number)).status).toBe(404);
    },
  );

  it("keeps the order as it was placed when the product changes later", async () => {
    const { cookie } = await signUp();
    await addToCart(cookie, await variantOf("S"));
    const { number } = (await place(cookie)).body.order;

    await exec("UPDATE products SET name = 'Renamed' WHERE slug = :slug", {
      slug: SLUG,
    });
    await exec(
      "UPDATE product_prices SET amount = 1 WHERE product_id = (SELECT id FROM products WHERE slug = :slug)",
      { slug: SLUG },
    );
    try {
      const order = (await getOrder(cookie, number)).body.order;
      expect(order.items[0]).toMatchObject({
        name: "Elegant Satin Midi Dress",
        unitAmount: 89000,
      });
      expect(order.total).toBe(89000);
    } finally {
      await exec(
        "UPDATE products SET name = 'Elegant Satin Midi Dress' WHERE slug = :slug",
        { slug: SLUG },
      );
    }
  });
});

describe("cancelling", () => {
  it("gives the stock back and marks the order cancelled", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 2);
    const { number } = (await place(cookie)).body.order;

    const result = await cancel(cookie, number);

    expect(result.status).toBe(200);
    expect(result.body.order).toMatchObject({
      status: "cancelled",
      reservationExpiresAt: null,
    });
    expect(await stockOf(variant)).toEqual({ on_hand: 25, reserved: 0 });

    const [payment] = await sql<{ status: string }>(
      "SELECT status FROM payments WHERE order_id = (SELECT id FROM orders WHERE number = :number)",
      { number },
    );
    expect(payment.status).toBe("cancelled");
    const history = await sql<{ to_status: string; actor_type: string }>(
      "SELECT to_status, actor_type FROM order_status_history WHERE order_id = (SELECT id FROM orders WHERE number = :number) ORDER BY id",
      { number },
    );
    expect(history.map((row) => [row.to_status, row.actor_type])).toEqual([
      ["waiting_payment", "customer"],
      ["cancelled", "customer"],
    ]);
  });

  it("cancelling twice is fine and gives the stock back only once", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 2);
    const { number } = (await place(cookie)).body.order;

    const results = await Promise.all([
      cancel(cookie, number),
      cancel(cookie, number),
      cancel(cookie, number),
    ]);

    expect(results.map((result) => result.status)).toEqual([200, 200, 200]);
    expect(await stockOf(variant)).toEqual({ on_hand: 25, reserved: 0 });
  });

  it("cannot cancel an order that was paid", async () => {
    const { cookie } = await signUp();
    await addToCart(cookie, await variantOf("S"));
    const { number } = (await place(cookie)).body.order;
    await simulate(cookie, number);

    const result = await cancel(cookie, number);

    expect(result.status).toBe(409);
    expect(result.body.error.message).toContain("can no longer be cancelled");
  });
});

describe("running out of time", () => {
  const makeLate = (number: string) =>
    exec(
      "UPDATE orders SET reservation_expires_at = now() - interval '1 minute' WHERE number = :number",
      { number },
    );

  it("gives the stock back when the order is looked at after its time ran out", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 2);
    const { number } = (await place(cookie)).body.order;
    await makeLate(number);

    const order = (await getOrder(cookie, number)).body.order;

    expect(order.status).toBe("cancelled");
    expect(await stockOf(variant)).toEqual({ on_hand: 25, reserved: 0 });
    const [row] = await sql<{ cancel_reason: string }>(
      "SELECT cancel_reason FROM orders WHERE number = :number",
      { number },
    );
    expect(row.cancel_reason).toBe("Not paid in time");
  });

  it("frees held stock for the next buyer who checks out", async () => {
    const ada = await signUp();
    const bob = await signUp();
    const variant = await variantOf("S");
    await setStock(variant, 1);
    // Bob has the last unit in his cart, and saw it, before Ada takes it.
    await addToCart(bob.cookie, variant);
    const bobSaw = await orderBody(bob.cookie);
    await addToCart(ada.cookie, variant);
    const { number } = (await place(ada.cookie)).body.order;
    await makeLate(number);

    const result = await placeWith(bob.cookie, bobSaw);

    expect(result.status).toBe(201);
    expect(await stockOf(variant)).toEqual({ on_hand: 1, reserved: 1 });
    expect((await getOrder(ada.cookie, number)).body.order.status).toBe(
      "cancelled",
    );
  });

  it("is swept by the server script, as the timer on the VPS does", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 2);
    const { number } = (await place(cookie)).body.order;
    const fresh = await signUp();
    await addToCart(fresh.cookie, variant, 1);
    const kept = (await place(fresh.cookie)).body.order;
    await makeLate(number);

    const output = execFileSync(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "db/expire-orders.ts"],
      {
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        encoding: "utf8",
      },
    );

    expect(output).toContain("Released 1 unpaid order(s)");
    expect(await stockOf(variant)).toEqual({ on_hand: 25, reserved: 1 });
    const statuses = await sql<{ number: string; status: string }>(
      "SELECT number, status FROM orders WHERE number IN (:a, :b)",
      { a: number, b: kept.number },
    );
    expect(
      Object.fromEntries(statuses.map((row) => [row.number, row.status])),
    ).toEqual({
      [number]: "cancelled",
      [kept.number]: "waiting_payment",
    });
  });

  it("does not cancel an order that was paid in time", async () => {
    const { cookie } = await signUp();
    await addToCart(cookie, await variantOf("S"));
    const { number } = (await place(cookie)).body.order;
    await simulate(cookie, number);
    await makeLate(number);

    expect((await getOrder(cookie, number)).body.order.status).toBe(
      "processing",
    );
  });
});

describe("payment", () => {
  it("turns held stock into a sale when the payment is confirmed", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 2);
    const { number } = (await place(cookie)).body.order;

    const result = await simulate(cookie, number);

    expect(result.status).toBe(200);
    expect(result.body.order).toMatchObject({
      status: "processing",
      paymentStatus: "paid",
      reservationExpiresAt: null,
    });
    expect(result.body.order.paidAt).not.toBeNull();
    expect(await stockOf(variant)).toEqual({ on_hand: 23, reserved: 0 });

    const movements = await sql<{ delta: number; reason: string }>(
      "SELECT delta, reason FROM stock_movements WHERE order_id = (SELECT id FROM orders WHERE number = :number)",
      { number },
    );
    expect(movements).toEqual([{ delta: -2, reason: "sale" }]);
    const history = await sql<{ to_status: string; actor_type: string }>(
      "SELECT to_status, actor_type FROM order_status_history WHERE order_id = (SELECT id FROM orders WHERE number = :number) ORDER BY id",
      { number },
    );
    expect(history.map((row) => [row.to_status, row.actor_type])).toEqual([
      ["waiting_payment", "customer"],
      ["processing", "payment"],
    ]);
    const [payment] = await sql<{ status: string }>(
      "SELECT status FROM payments WHERE order_id = (SELECT id FROM orders WHERE number = :number)",
      { number },
    );
    expect(payment.status).toBe("succeeded");
  });

  it("counts a payment once, however many times it is reported", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 2);
    const { number } = (await place(cookie)).body.order;

    await Promise.all([
      simulate(cookie, number),
      simulate(cookie, number),
      simulate(cookie, number),
    ]);
    await simulate(cookie, number);

    expect(await stockOf(variant)).toEqual({ on_hand: 23, reserved: 0 });
    expect(
      await sql("SELECT 1 FROM stock_movements WHERE reason = 'sale'"),
    ).toHaveLength(1);
  });

  it("keeps the order waiting after a failed payment, so the customer can try again", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant);
    const { number } = (await place(cookie)).body.order;

    const failed = await simulate(cookie, number, "failure");
    expect(failed.body.order).toMatchObject({
      status: "waiting_payment",
      paymentStatus: "failed",
    });
    expect(await stockOf(variant)).toEqual({ on_hand: 25, reserved: 1 });

    const retry = await simulate(cookie, number, "success");
    expect(retry.body.order).toMatchObject({
      status: "processing",
      paymentStatus: "paid",
    });
  });

  it("a failure report cannot undo a payment that went through", async () => {
    const { cookie } = await signUp();
    await addToCart(cookie, await variantOf("S"));
    const { number } = (await place(cookie)).body.order;
    await simulate(cookie, number, "success");

    const result = await simulate(cookie, number, "failure");

    expect(result.body.order).toMatchObject({
      status: "processing",
      paymentStatus: "paid",
    });
  });

  it("takes the stock again when a payment arrives after the order was cancelled and stock is still there", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 2);
    const { number } = (await place(cookie)).body.order;
    await cancel(cookie, number);

    const result = await simulate(cookie, number);

    expect(result.body.order).toMatchObject({
      status: "processing",
      paymentStatus: "paid",
    });
    expect(await stockOf(variant)).toEqual({ on_hand: 23, reserved: 0 });
    const [row] = await sql<{ cancelled_at: Date | null; stock_state: string }>(
      "SELECT cancelled_at, stock_state FROM orders WHERE number = :number",
      { number },
    );
    expect(row).toEqual({ cancelled_at: null, stock_state: "committed" });
  });

  it("flags an order that was paid after it was cancelled and the stock is gone", async () => {
    const ada = await signUp();
    const bob = await signUp();
    const variant = await variantOf("S");
    await setStock(variant, 1);
    await addToCart(ada.cookie, variant);
    const { number } = (await place(ada.cookie)).body.order;
    await cancel(ada.cookie, number);
    await addToCart(bob.cookie, variant);
    expect((await place(bob.cookie)).status).toBe(201);

    const result = await simulate(ada.cookie, number);

    expect(result.body.order).toMatchObject({
      status: "cancelled",
      paymentStatus: "paid",
    });
    // The stock belongs to Bob's order and was not taken twice.
    expect(await stockOf(variant)).toEqual({ on_hand: 1, reserved: 1 });
    const [note] = await sql<{ note: string }>(
      "SELECT note FROM order_status_history WHERE order_id = (SELECT id FROM orders WHERE number = :number) ORDER BY id DESC LIMIT 1",
      { number },
    );
    expect(note.note).toContain("needs a refund");
    // Reporting the same payment again changes nothing and adds no second note.
    await simulate(ada.cookie, number);
    const history = await sql(
      "SELECT 1 FROM order_status_history WHERE order_id = (SELECT id FROM orders WHERE number = :number)",
      { number },
    );
    expect(history).toHaveLength(3);
  });
});

describe("deleting an account", () => {
  it("gives back the stock of unpaid orders and keeps paid ones", async () => {
    const { cookie, id } = await signUp();
    const variant = await variantOf("S");
    await addToCart(cookie, variant, 2);
    const unpaid = (await place(cookie)).body.order;
    await addToCart(cookie, variant, 1);
    const paid = (await place(cookie)).body.order;
    await simulate(cookie, paid.number);

    const result = await call(deleteAccount, {
      method: "DELETE",
      cookie,
      body: { password: PASSWORD },
      ip: newIp(),
    });

    expect(result.status).toBe(204);
    const rows = await sql<{ number: string; status: string }>(
      "SELECT number, status FROM orders WHERE customer_id = :id ORDER BY number",
      { id },
    );
    expect(
      Object.fromEntries(rows.map((row) => [row.number, row.status])),
    ).toEqual({
      [unpaid.number]: "cancelled",
      [paid.number]: "processing",
    });
    expect(await stockOf(variant)).toEqual({ on_hand: 24, reserved: 0 });
  });
});
