import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { POST as register } from "@/app/api/v1/auth/register/route";
import { GET as getCartRoute } from "@/app/api/v1/cart/route";
import { POST as addRoute } from "@/app/api/v1/cart/items/route";
import { GET as pricingRoute } from "@/app/api/v1/checkout/pricing/route";
import { PATCH as patchSettingsRoute } from "@/app/api/v1/admin/settings/route";
import { POST as createRoute } from "@/app/api/v1/orders/route";
import { importSampleCatalog } from "@/server/catalog/import-sample-catalog";

import { signedInStaff } from "./admin-helpers";
import { call, exec, sql, uniqueEmail } from "./helpers";

const PASSWORD = "Sup3r-secret-pw";
const SLUG = "elegant-satin-midi-dress";
const PK_FEE = 30_000;
const DE_FEE = 590;

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
  return result.cookie as string;
}

async function variantOf(size: string) {
  const [row] = await sql<{ id: string }>(
    `SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id
     WHERE p.slug = :slug AND v.size_label = :size AND v.color_name = 'Green'`,
    { slug: SLUG, size },
  );
  return row.id;
}

const addToCart = (
  cookie: string,
  variantId: string,
  quantity: number,
  market: Market,
) =>
  call(addRoute, {
    method: "POST",
    cookie,
    body: { variantId, quantity, market },
  });

interface CartLineBody {
  variantId: string;
  quantity: number;
  selected: boolean;
  unitPrice: { amount: number };
}

/** The order body the website would send, with `expected.total` as the shopper saw it. */
async function orderBody(
  cookie: string,
  market: Market,
  expectedTotal?: (goods: number) => number,
) {
  const cart = await call(getCartRoute, {
    method: "GET",
    cookie,
    path: `/api/v1/cart?market=${market}`,
  });
  const lines = (cart.body.items as CartLineBody[]).filter(
    (line) => line.selected,
  );
  const goods = lines.reduce(
    (sum, line) => sum + line.unitPrice.amount * line.quantity,
    0,
  );
  const fee = market === "PK" ? PK_FEE : DE_FEE;

  return {
    market,
    contact: { email: "ada@example.com", phone: "+49 30 1234567" },
    shipping: {
      fullName: "Ada Lovelace",
      country: market === "PK" ? "Pakistan" : "Germany",
      city: market === "PK" ? "Lahore" : "Berlin",
      address: "Main Street 5",
      zip: "10115",
    },
    billing: "same",
    paymentMethod: "card",
    acceptTerms: true,
    expected: {
      total: expectedTotal ? expectedTotal(goods) : goods + fee,
      items: lines.map(({ variantId, quantity }) => ({ variantId, quantity })),
    },
  };
}

const place = (cookie: string, body: unknown) =>
  call(createRoute, { method: "POST", cookie, body });

let pool: pg.Pool;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  await importSampleCatalog(pool);
  // The shipping fees and VAT rate are shop settings in the database.
  await exec(
    `UPDATE shop_settings SET shipping_fee_pk = :pk, shipping_fee_de = :de, vat_rate_de_percent = 19`,
    { pk: PK_FEE, de: DE_FEE },
  );
});

afterAll(async () => {
  await exec(
    "UPDATE shop_settings SET shipping_fee_pk = 0, shipping_fee_de = 0, vat_rate_de_percent = 19",
  );
  // Leave no orders holding stock behind: other test files expect the freshly imported catalogue.
  await exec("DELETE FROM stock_movements WHERE reason = 'sale'");
  await exec("DELETE FROM orders");
  await exec("UPDATE inventory SET on_hand = 25, reserved = 0");
  await pool.end();
});

beforeEach(async () => {
  await exec("DELETE FROM stock_movements WHERE reason = 'sale'");
  await exec("DELETE FROM orders");
  await exec("UPDATE inventory SET on_hand = 25, reserved = 0");
});

describe("GET /api/v1/checkout/pricing", () => {
  it("tells the cart what the server will charge in each market, to anyone", async () => {
    const pk = await call(pricingRoute, {
      method: "GET",
      path: "/api/v1/checkout/pricing?market=PK",
    });
    expect(pk.status).toBe(200);
    expect(pk.body).toEqual({
      market: "PK",
      shippingFee: PK_FEE,
      taxIncluded: null,
      vatRatePercent: null,
    });

    const de = await call(pricingRoute, {
      method: "GET",
      path: "/api/v1/checkout/pricing?market=DE",
    });
    expect(de.body).toEqual({
      market: "DE",
      shippingFee: DE_FEE,
      taxIncluded: true,
      vatRatePercent: 19,
    });
  });

  it("is not cached, so a changed fee shows at once", async () => {
    const result = await call(pricingRoute, {
      method: "GET",
      path: "/api/v1/checkout/pricing?market=PK",
    });
    expect(result.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses an unknown market", async () => {
    const result = await call(pricingRoute, {
      method: "GET",
      path: "/api/v1/checkout/pricing?market=FR",
    });
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe("validation_failed");
  });
});

describe("shipping and VAT on an order", () => {
  it("Pakistan: adds the flat shipping fee once and works out no tax", async () => {
    const cookie = await signUp();
    await addToCart(cookie, await variantOf("S"), 2, "PK");

    const result = await place(cookie, await orderBody(cookie, "PK"));

    expect(result.status).toBe(201);
    const { order } = result.body;
    expect(order).toMatchObject({
      market: "PK",
      shippingTotal: PK_FEE,
      discountTotal: 0,
      taxTotal: 0,
      taxIncluded: null,
    });
    expect(order.total).toBe(order.subtotal + PK_FEE);

    const [stored] = await sql<{ shipping_total: string; tax_included: null }>(
      "SELECT shipping_total, tax_included FROM orders WHERE number = :number",
      { number: order.number },
    );
    expect(Number(stored.shipping_total)).toBe(PK_FEE);
    expect(stored.tax_included).toBeNull();
  });

  it("Germany: VAT is already inside the total, worked out on goods plus shipping", async () => {
    const cookie = await signUp();
    await addToCart(cookie, await variantOf("M"), 1, "DE");

    const result = await place(cookie, await orderBody(cookie, "DE"));

    expect(result.status).toBe(201);
    const { order } = result.body;
    expect(order).toMatchObject({
      market: "DE",
      currency: "EUR",
      shippingTotal: DE_FEE,
      taxIncluded: true,
    });
    // The VAT is inside the total, so it is not added.
    expect(order.total).toBe(order.subtotal + DE_FEE);
    expect(order.taxTotal).toBe(Math.round((order.total * 19) / 119));

    const [stored] = await sql<{ tax_included: boolean; tax_total: string }>(
      "SELECT tax_included, tax_total FROM orders WHERE number = :number",
      { number: order.number },
    );
    expect(stored.tax_included).toBe(true);
    expect(Number(stored.tax_total)).toBe(order.taxTotal);
  });

  it("refuses a total that leaves the shipping fee out, so nobody pays an amount they did not see", async () => {
    const cookie = await signUp();
    await addToCart(cookie, await variantOf("S"), 1, "PK");

    const result = await place(
      cookie,
      await orderBody(cookie, "PK", (goods) => goods),
    );

    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("cart_changed");
    const [count] = await sql<{ n: string }>(
      "SELECT count(*) AS n FROM orders",
    );
    expect(Number(count.n)).toBe(0);
  });

  it("reads the stored shipping and VAT back when the order is listed", async () => {
    const cookie = await signUp();
    await addToCart(cookie, await variantOf("M"), 1, "DE");
    const { order } = (await place(cookie, await orderBody(cookie, "DE"))).body;

    const { GET: listRoute } = await import("@/app/api/v1/orders/route");
    const listed = await call(listRoute, { method: "GET", cookie });

    expect(listed.body.items[0]).toMatchObject({
      number: order.number,
      shippingTotal: DE_FEE,
      taxIncluded: true,
      taxTotal: order.taxTotal,
    });
  });
});

describe("a change made by staff", () => {
  it("applies to new orders only: orders that exist keep what they were placed with", async () => {
    const staff = await signedInStaff({ permissions: ["settings.manage"] });
    const cookie = await signUp();
    await addToCart(cookie, await variantOf("S"), 1, "PK");
    const before = (await place(cookie, await orderBody(cookie, "PK"))).body
      .order;
    expect(before.shippingTotal).toBe(PK_FEE);

    const changed = await call(patchSettingsRoute, {
      method: "PATCH",
      staffCookie: staff.cookie,
      body: { shippingFee: { PK: 45_000 } },
    });
    expect(changed.status).toBe(200);

    // The old order did not change...
    const [stored] = await sql<{ shipping_total: string; total: string }>(
      "SELECT shipping_total, total FROM orders WHERE number = :number",
      { number: before.number },
    );
    expect(Number(stored.shipping_total)).toBe(PK_FEE);
    expect(Number(stored.total)).toBe(before.total);

    // ...and the next one uses the new fee, so the old total is refused.
    const second = await signUp();
    await addToCart(second, await variantOf("M"), 1, "PK");
    const stale = await place(
      second,
      await orderBody(second, "PK", (goods) => goods + PK_FEE),
    );
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("cart_changed");

    const fresh = await place(second, {
      ...(await orderBody(second, "PK")),
      expected: {
        ...(await orderBody(second, "PK")).expected,
        total: (await orderBody(second, "PK")).expected.total - PK_FEE + 45_000,
      },
    });
    expect(fresh.status).toBe(201);
    expect(fresh.body.order.shippingTotal).toBe(45_000);

    await exec("UPDATE shop_settings SET shipping_fee_pk = :fee", {
      fee: PK_FEE,
    });
  });

  it("holds the stock of a new order for the minutes set in the settings", async () => {
    const staff = await signedInStaff({ permissions: ["settings.manage"] });
    await call(patchSettingsRoute, {
      method: "PATCH",
      staffCookie: staff.cookie,
      body: { reservationMinutes: 10 },
    });
    const cookie = await signUp();
    await addToCart(cookie, await variantOf("S"), 1, "PK");

    const { order } = (await place(cookie, await orderBody(cookie, "PK"))).body;

    const minutes =
      (Date.parse(order.reservationExpiresAt) - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(9);
    expect(minutes).toBeLessThanOrEqual(10);

    await exec("UPDATE shop_settings SET reservation_minutes = 30");
  });
});
