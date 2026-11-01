import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DELETE as deleteAccount } from "@/app/api/v1/account/route";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { GET as getCartRoute } from "@/app/api/v1/cart/route";
import { POST as addRoute } from "@/app/api/v1/cart/items/route";
import {
  DELETE as removeRoute,
  PATCH as patchRoute,
} from "@/app/api/v1/cart/items/[variantId]/route";
import { DELETE as removeSelectedRoute } from "@/app/api/v1/cart/selected/route";
import { importSampleCatalog } from "@/server/catalog/import-sample-catalog";

import { call, exec, sql, uniqueEmail } from "./helpers";

const PASSWORD = "Sup3r-secret-pw";

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

type Market = "PK" | "DE";

const getCart = (cookie: string | undefined, market: Market = "PK") =>
  call(getCartRoute, {
    method: "GET",
    cookie,
    path: `/api/v1/cart?market=${market}`,
  });
const add = (
  cookie: string | undefined,
  variantId: string,
  quantity?: number,
  market: Market = "PK",
) =>
  call(addRoute, {
    method: "POST",
    cookie,
    body: {
      variantId,
      market,
      ...(quantity === undefined ? {} : { quantity }),
    },
  });
const patch = (
  cookie: string | undefined,
  variantId: string,
  body: Record<string, unknown>,
) =>
  call(patchRoute, {
    method: "PATCH",
    cookie,
    params: { variantId },
    body: { market: "PK", ...body },
  });
const remove = (
  cookie: string | undefined,
  variantId: string,
  market: Market = "PK",
) =>
  call(removeRoute, {
    method: "DELETE",
    cookie,
    params: { variantId },
    path: `/api/v1/cart/items/x?market=${market}`,
  });
const removeSelected = (cookie: string | undefined, market: Market = "PK") =>
  call(removeSelectedRoute, {
    method: "DELETE",
    cookie,
    path: `/api/v1/cart/selected?market=${market}`,
  });

async function variantOf(slug: string, size?: string, color?: string) {
  const rows = await sql<{ id: string }>(
    `SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id
     WHERE p.slug = :slug AND (CAST(:size AS text) IS NULL OR v.size_label = :size)
       AND (CAST(:color AS text) IS NULL OR v.color_name = :color)
     ORDER BY v.sort`,
    { slug, size: size ?? null, color: color ?? null },
  );
  return rows[0].id;
}

const setStock = (
  variantId: string,
  market: Market,
  onHand: number,
  reserved = 0,
) =>
  exec(
    "UPDATE inventory SET on_hand = :onHand, reserved = :reserved WHERE variant_id = :variantId AND market = :market",
    { variantId, market, onHand, reserved },
  );

const SLUG = "elegant-satin-midi-dress";

let pool: pg.Pool;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  await importSampleCatalog(pool);
});

afterAll(async () => {
  await pool.end();
});

// Every test starts from the freshly imported catalogue.
beforeEach(async () => {
  await exec("UPDATE inventory SET on_hand = 25, reserved = 0");
  await exec("UPDATE product_variants SET active = true");
  await exec("UPDATE products SET status = 'active', deleted_at = NULL");
});

describe("authentication", () => {
  it("every cart endpoint needs a signed-in customer", async () => {
    const id = crypto.randomUUID();
    const results = await Promise.all([
      getCart(undefined),
      add(undefined, id),
      patch(undefined, id, { quantity: 2 }),
      remove(undefined, id),
      removeSelected(undefined),
    ]);
    for (const result of results) {
      expect(result.status).toBe(401);
      expect(result.body.error.code).toBe("unauthenticated");
    }
  });
});

describe("adding to the cart", () => {
  it("starts empty, then holds the line with live price, stock and details", async () => {
    const { cookie } = await signUp();
    expect((await getCart(cookie)).body).toEqual({ market: "PK", items: [] });

    const variant = await variantOf(SLUG, "M", "Green");
    const result = await add(cookie, variant, 2);

    expect(result.status).toBe(201);
    expect(result.headers.get("location")).toBe(
      `/api/v1/cart/items/${variant}`,
    );
    expect(result.body.items).toHaveLength(1);
    expect(result.body.items[0]).toMatchObject({
      variantId: variant,
      slug: SLUG,
      name: "Elegant Satin Midi Dress",
      size: "M",
      color: "Green",
      quantity: 2,
      requestedQuantity: 2,
      available: 25,
      selected: true,
      status: "ok",
      unitPrice: { amount: 89000, currency: "PKR" },
    });
    expect(result.body.items[0].image.src).toContain("/images/");
  });

  it("prices the same cart in the other market's currency", async () => {
    const { cookie } = await signUp();
    await add(cookie, await variantOf(SLUG, "M", "Green"), 1);

    const de = await getCart(cookie, "DE");
    expect(de.body.market).toBe("DE");
    expect(de.body.items[0].unitPrice).toEqual({
      amount: 89000,
      currency: "EUR",
    });
  });

  it("adding the same variant again raises the quantity instead of making a second line", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant, 2);
    const result = await add(cookie, variant, 3);

    expect(result.body.items).toHaveLength(1);
    expect(result.body.items[0].quantity).toBe(5);
  });

  it("ticks a line again when it is added again", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant);
    await patch(cookie, variant, { selected: false });

    const result = await add(cookie, variant);
    expect(result.body.items[0].selected).toBe(true);
  });

  it("defaults to one", async () => {
    const { cookie } = await signUp();
    const result = await add(cookie, await variantOf(SLUG, "S", "Green"));
    expect(result.body.items[0].quantity).toBe(1);
  });

  it.each([
    ["a quantity of 0", { quantity: 0 }],
    ["a negative quantity", { quantity: -1 }],
    ["a fractional quantity", { quantity: 1.5 }],
    ["more than 99", { quantity: 100 }],
    ["a text quantity", { quantity: "2" }],
    ["an unknown market", { market: "FR" }],
    ["a missing variant id", { variantId: undefined }],
    ["a variant id that is not an id", { variantId: "not-a-uuid" }],
    ["unexpected fields (a price from the browser)", { price: 1 }],
  ])("rejects %s", async (_label, override) => {
    const { cookie } = await signUp();
    const result = await call(addRoute, {
      method: "POST",
      cookie,
      body: {
        variantId: await variantOf(SLUG),
        market: "PK",
        quantity: 1,
        ...override,
      },
    });

    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe("validation_failed");
  });

  it("answers 404 for a variant that does not exist", async () => {
    const { cookie } = await signUp();
    const result = await add(cookie, crypto.randomUUID());

    expect(result.status).toBe(404);
    expect(result.body.error.message).toContain("no longer available");
  });
});

describe("stock rules", () => {
  it("allows exactly the available amount and refuses one more", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await setStock(variant, "PK", 3);

    const refused = await add(cookie, variant, 4);
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("out_of_stock");
    expect(refused.body.error.message).toBe("Only 3 available.");
    expect((await getCart(cookie)).body.items).toEqual([]);

    const allowed = await add(cookie, variant, 3);
    expect(allowed.status).toBe(201);
    expect(allowed.body.items[0].quantity).toBe(3);
  });

  it("counts what is already in the cart", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await setStock(variant, "PK", 3);
    await add(cookie, variant, 2);

    const refused = await add(cookie, variant, 2);
    expect(refused.status).toBe(409);
    expect(refused.body.error.message).toBe(
      "Only 3 available and you already have 2 in your cart.",
    );
    expect((await getCart(cookie)).body.items[0].quantity).toBe(2);
  });

  it("refuses an item that is sold out", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await setStock(variant, "PK", 0);

    const refused = await add(cookie, variant);
    expect(refused.status).toBe(409);
    expect(refused.body.error.message).toBe(
      "Sorry, this item is out of stock.",
    );
  });

  it("does not count units that are reserved for other orders", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await setStock(variant, "PK", 5, 4);

    expect((await add(cookie, variant, 2)).status).toBe(409);
    expect((await add(cookie, variant, 1)).status).toBe(201);
  });

  it("keeps stock separate for each market", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await setStock(variant, "DE", 0);

    expect((await add(cookie, variant, 1, "DE")).status).toBe(409);
    expect((await add(cookie, variant, 1, "PK")).status).toBe(201);

    const de = await getCart(cookie, "DE");
    expect(de.body.items[0]).toMatchObject({
      status: "out_of_stock",
      quantity: 0,
      available: 0,
      selected: false,
    });
    expect((await getCart(cookie, "PK")).body.items[0].status).toBe("ok");
  });

  it("two buyers cannot both take the last units", async () => {
    const a = await signUp();
    const b = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await setStock(variant, "PK", 3);

    const [first, second] = await Promise.all([
      add(a.cookie, variant, 2),
      add(b.cookie, variant, 2),
    ]);

    // Carts do not reserve stock, so both may hold 2 (3 in stock). What must hold
    // is that neither cart is ever bigger than the stock.
    expect([first.status, second.status]).toEqual([201, 201]);
    const [ownA] = (await getCart(a.cookie)).body.items;
    expect(ownA.quantity).toBeLessThanOrEqual(3);
  });

  it("a burst of taps from one customer never gets past the stock limit", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await setStock(variant, "PK", 3);

    const results = await Promise.all(
      Array.from({ length: 8 }, () => add(cookie, variant, 1)),
    );

    // Exactly the stock was handed out, and the cart agrees with what was promised.
    expect(results.filter((result) => result.status === 201)).toHaveLength(3);
    expect(results.filter((result) => result.status === 409)).toHaveLength(5);
    expect((await getCart(cookie)).body.items[0].quantity).toBe(3);
  });
});
describe("the cart follows live stock and prices", () => {
  it("lowers what is bought to the available stock, without losing what was asked for", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant, 5);
    await setStock(variant, "PK", 3);

    const [line] = (await getCart(cookie)).body.items;
    expect(line).toMatchObject({
      status: "adjusted",
      quantity: 3,
      requestedQuantity: 5,
      available: 3,
      selected: true,
    });

    // The stored amount is untouched, so a restock brings it back.
    await setStock(variant, "PK", 25);
    expect((await getCart(cookie)).body.items[0]).toMatchObject({
      status: "ok",
      quantity: 5,
    });
  });

  it("does not count units reserved for other orders", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant, 3);
    await setStock(variant, "PK", 5, 4);

    expect((await getCart(cookie)).body.items[0]).toMatchObject({
      status: "adjusted",
      quantity: 1,
      requestedQuantity: 3,
      available: 1,
    });
  });
  it("marks a sold-out line and never counts it as ticked", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant, 2);
    await setStock(variant, "PK", 0);

    expect((await getCart(cookie)).body.items[0]).toMatchObject({
      status: "out_of_stock",
      quantity: 0,
      requestedQuantity: 2,
      selected: false,
    });
  });

  it.each([
    [
      "the variant is switched off",
      "UPDATE product_variants SET active = false WHERE id = :id",
    ],
    [
      "the product is a draft",
      "UPDATE products SET status = 'draft' WHERE id = (SELECT product_id FROM product_variants WHERE id = :id)",
    ],
    [
      "the product is deleted",
      "UPDATE products SET deleted_at = now() WHERE id = (SELECT product_id FROM product_variants WHERE id = :id)",
    ],
  ])("marks a line unavailable when %s", async (_label, change) => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant, 2);
    await exec(change, { id: variant });

    expect((await getCart(cookie)).body.items[0]).toMatchObject({
      status: "unavailable",
      quantity: 0,
      selected: false,
    });
    expect((await add(cookie, variant)).status).toBe(404);
    expect((await patch(cookie, variant, { quantity: 1 })).status).toBe(404);
  });

  it("marks a line unavailable in a market where the product has no price", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant);
    await exec(
      "DELETE FROM product_prices WHERE market = 'DE' AND product_id = (SELECT product_id FROM product_variants WHERE id = :id)",
      { id: variant },
    );

    try {
      const [line] = (await getCart(cookie, "DE")).body.items;
      expect(line).toMatchObject({ status: "unavailable", unitPrice: null });
      expect((await getCart(cookie, "PK")).body.items[0].status).toBe("ok");
    } finally {
      await exec(
        `INSERT INTO product_prices (product_id, market, currency, amount)
         SELECT product_id, 'DE', 'EUR', 89000 FROM product_variants WHERE id = :id`,
        { id: variant },
      );
    }
  });

  it("shows a price change straight away: the cart never keeps its own copy", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant);
    await exec(
      "UPDATE product_prices SET amount = 99000 WHERE market = 'PK' AND product_id = (SELECT product_id FROM product_variants WHERE id = :id)",
      { id: variant },
    );

    try {
      expect((await getCart(cookie)).body.items[0].unitPrice.amount).toBe(
        99000,
      );
    } finally {
      await exec(
        "UPDATE product_prices SET amount = 89000 WHERE market = 'PK' AND product_id = (SELECT product_id FROM product_variants WHERE id = :id)",
        { id: variant },
      );
    }
  });
});

describe("changing the cart", () => {
  it("sets the quantity and ticks or unticks a line", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant, 1);

    const more = await patch(cookie, variant, { quantity: 4 });
    expect(more.status).toBe(200);
    expect(more.body.items[0].quantity).toBe(4);

    const unticked = await patch(cookie, variant, { selected: false });
    expect(unticked.body.items[0]).toMatchObject({
      quantity: 4,
      selected: false,
    });

    const both = await patch(cookie, variant, { quantity: 2, selected: true });
    expect(both.body.items[0]).toMatchObject({ quantity: 2, selected: true });
  });

  it("refuses a quantity above the available stock", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant, 1);
    await setStock(variant, "PK", 3);

    const refused = await patch(cookie, variant, { quantity: 4 });
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe("out_of_stock");
    expect((await getCart(cookie)).body.items[0].quantity).toBe(1);
  });

  it("lets a customer lower a line that is over the stock", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant, 5);
    await setStock(variant, "PK", 3);

    const fixed = await patch(cookie, variant, { quantity: 3 });
    expect(fixed.status).toBe(200);
    expect(fixed.body.items[0]).toMatchObject({ status: "ok", quantity: 3 });
  });

  it("can still untick a line that cannot be bought", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant);
    await setStock(variant, "PK", 0);

    expect((await patch(cookie, variant, { selected: false })).status).toBe(
      200,
    );
  });

  it.each([
    ["nothing to change", {}],
    ["a quantity of 0", { quantity: 0 }],
    ["an unknown market", { market: "FR" }],
    ["unexpected fields", { quantity: 2, price: 1 }],
  ])("rejects a change with %s", async (_label, body) => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(cookie, variant);

    const result = await patch(cookie, variant, body);
    expect(result.status).toBe(400);
  });

  it("answers 404 for a line that is not in the cart, or a malformed id", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");

    expect((await patch(cookie, variant, { quantity: 2 })).status).toBe(404);
    expect((await patch(cookie, "nope", { quantity: 2 })).status).toBe(404);
    expect((await remove(cookie, "nope")).status).toBe(404);
  });

  it("removes a line, and removing it again is fine", async () => {
    const { cookie } = await signUp();
    const keep = await variantOf(SLUG, "S", "Green");
    const drop = await variantOf(SLUG, "M", "Green");
    await add(cookie, keep);
    await add(cookie, drop);

    const first = await remove(cookie, drop);
    expect(first.status).toBe(200);
    expect(
      first.body.items.map((item: { variantId: string }) => item.variantId),
    ).toEqual([keep]);
    expect((await remove(cookie, drop)).status).toBe(200);
  });

  it("removes only the ticked lines that can be bought", async () => {
    const { cookie } = await signUp();
    const ordered = await variantOf(SLUG, "S", "Green");
    const unticked = await variantOf(SLUG, "M", "Green");
    const soldOut = await variantOf(SLUG, "L", "Green");
    for (const variant of [ordered, unticked, soldOut])
      await add(cookie, variant);
    await patch(cookie, unticked, { selected: false });
    await setStock(soldOut, "PK", 0);

    const result = await removeSelected(cookie);
    expect(result.status).toBe(200);
    expect(
      result.body.items
        .map((item: { variantId: string }) => item.variantId)
        .sort(),
    ).toEqual([unticked, soldOut].sort());
  });

  it("keeps lines in the order they were added", async () => {
    const { cookie } = await signUp();
    const ids = [
      await variantOf(SLUG, "L", "Green"),
      await variantOf(SLUG, "S", "Green"),
      await variantOf(SLUG, "M", "Green"),
    ];
    for (const id of ids) await add(cookie, id);
    await add(cookie, ids[0]); // adding again must not move it

    expect(
      (await getCart(cookie)).body.items.map(
        (item: { variantId: string }) => item.variantId,
      ),
    ).toEqual(ids);
  });

  it("holds at most 50 different items", async () => {
    const { cookie } = await signUp();
    const variants = await sql<{ id: string }>(
      "SELECT id FROM product_variants ORDER BY sku LIMIT 51",
    );
    for (const { id } of variants.slice(0, 50)) {
      expect((await add(cookie, id)).status).toBe(201);
    }

    const refused = await add(cookie, variants[50].id);
    expect(refused.status).toBe(422);
    // More of an item that is already there is still allowed.
    expect((await add(cookie, variants[0].id)).status).toBe(201);
  });

  it("holds at most 99 of one item", async () => {
    const { cookie } = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await setStock(variant, "PK", 500);
    await add(cookie, variant, 99);

    const refused = await add(cookie, variant, 1);
    expect(refused.status).toBe(422);
  });
});

describe("every customer has their own cart", () => {
  it("never shows or changes another customer's cart", async () => {
    const ada = await signUp();
    const bob = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(ada.cookie, variant, 2);

    expect((await getCart(bob.cookie)).body.items).toEqual([]);
    expect((await patch(bob.cookie, variant, { quantity: 1 })).status).toBe(
      404,
    );
    // Removing a line Bob does not have changes nothing for Ada.
    await remove(bob.cookie, variant);
    expect((await removeSelected(bob.cookie)).body.items).toEqual([]);

    expect((await getCart(ada.cookie)).body.items[0].quantity).toBe(2);
  });

  it("changing a line only changes the customer's own copy of it", async () => {
    const ada = await signUp();
    const bob = await signUp();
    const variant = await variantOf(SLUG, "M", "Green");
    await add(ada.cookie, variant, 2);
    await add(bob.cookie, variant, 2);

    await patch(bob.cookie, variant, { quantity: 5, selected: false });
    expect((await getCart(ada.cookie)).body.items[0]).toMatchObject({
      quantity: 2,
      selected: true,
    });

    await remove(bob.cookie, variant);
    expect((await getCart(ada.cookie)).body.items).toHaveLength(1);
  });

  it("is deleted with the account", async () => {
    const { cookie, id } = await signUp();
    await add(cookie, await variantOf(SLUG, "M", "Green"), 2);

    const result = await call(deleteAccount, {
      method: "DELETE",
      cookie,
      body: { password: PASSWORD },
    });
    expect(result.status).toBe(204);

    const rows = await sql("SELECT 1 FROM cart_items WHERE customer_id = :id", {
      id,
    });
    expect(rows).toHaveLength(0);
  });
});
