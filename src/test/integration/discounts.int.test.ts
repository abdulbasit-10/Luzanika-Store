import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  GET as listRoute,
  POST as createRoute,
} from "@/app/api/v1/admin/discounts/route";
import {
  DELETE as deleteRoute,
  GET as getRoute,
  PATCH as patchRoute,
} from "@/app/api/v1/admin/discounts/[id]/route";
import { GET as productOptionsRoute } from "@/app/api/v1/admin/discounts/products/route";
import { GET as cartRoute } from "@/app/api/v1/cart/route";
import { GET as productRoute } from "@/app/api/v1/products/[slug]/route";
import { GET as orderRoute } from "@/app/api/v1/orders/[number]/route";

import { signedInStaff } from "./admin-helpers";
import { call, exec, sql } from "./helpers";
import {
  DRESS,
  addToCart,
  importCatalog,
  placeTestOrder,
  resetShopData,
  signUpCustomer,
  variantOf,
} from "./shop-helpers";

beforeAll(importCatalog);

async function clean() {
  await exec("DELETE FROM discounts");
}

beforeEach(async () => {
  await resetShopData();
  await clean();
});

// Discounts are shared data: leave none behind for the other test files.
afterAll(clean);

const manager = () =>
  signedInStaff({ permissions: ["discounts.view", "discounts.manage"] });

const list = (cookie: string | undefined, query = "") =>
  call(listRoute, {
    method: "GET",
    staffCookie: cookie,
    path: `/api/v1/admin/discounts${query}`,
  });
const get = (cookie: string | undefined, id: string) =>
  call(getRoute, { method: "GET", staffCookie: cookie, params: { id } });
const create = (cookie: string | undefined, body: unknown) =>
  call(createRoute, { method: "POST", staffCookie: cookie, body });
const change = (cookie: string | undefined, id: string, body: unknown) =>
  call(patchRoute, {
    method: "PATCH",
    staffCookie: cookie,
    params: { id },
    body,
  });
const remove = (cookie: string | undefined, id: string) =>
  call(deleteRoute, { method: "DELETE", staffCookie: cookie, params: { id } });

async function productId(slug = DRESS): Promise<string> {
  const [row] = await sql<{ id: string }>(
    "SELECT id FROM products WHERE slug = :slug",
    { slug },
  );
  return row.id;
}

async function listPrice(market: "PK" | "DE", slug = DRESS): Promise<number> {
  const [row] = await sql<{ amount: string }>(
    `SELECT pr.amount FROM product_prices pr JOIN products p ON p.id = pr.product_id
     WHERE p.slug = :slug AND pr.market = :market`,
    { slug, market },
  );
  return Number(row.amount);
}

async function shownPrice(market: "PK" | "DE", slug = DRESS) {
  const product = await call(productRoute, {
    method: "GET",
    params: { slug },
  });
  expect(product.status).toBe(200);
  return product.body.prices.find(
    (price: { region: string }) => price.region === market,
  ) as {
    amount: number;
    compareAtAmount?: number;
    discountPercent?: number;
  };
}

async function discountFor(
  over: Record<string, unknown> = {},
  slug = DRESS,
): Promise<string> {
  const staff = await manager();
  const made = await create(staff.cookie, {
    name: "Winter sale",
    percent: 20,
    markets: ["PK", "DE"],
    productIds: [await productId(slug)],
    ...over,
  });
  expect(made.status).toBe(201);
  return made.body.discount.id as string;
}

const HOUR = 3_600_000;
const inHours = (hours: number) =>
  new Date(Date.now() + hours * HOUR).toISOString();

describe("who may manage discounts", () => {
  it("needs a signed-in staff member with the right permission", async () => {
    const id = await discountFor();
    const viewer = await signedInStaff({ permissions: ["discounts.view"] });
    const nobody = await signedInStaff({ permissions: ["orders.view"] });
    const body = {
      name: "X",
      percent: 10,
      markets: ["PK"],
      productIds: [await productId()],
    };

    expect((await list(undefined)).status).toBe(401);
    expect((await list(nobody.cookie)).status).toBe(403);
    expect((await list(viewer.cookie)).status).toBe(200);
    expect((await get(viewer.cookie, id)).status).toBe(200);
    // Seeing is not changing.
    expect((await create(viewer.cookie, body)).status).toBe(403);
    expect((await change(viewer.cookie, id, { percent: 5 })).status).toBe(403);
    expect((await remove(viewer.cookie, id)).status).toBe(403);
    expect(
      (
        await call(productOptionsRoute, {
          method: "GET",
          staffCookie: viewer.cookie,
          path: "/api/v1/admin/discounts/products?search=dress",
        })
      ).status,
    ).toBe(200);
  });
});

describe("making and changing a discount", () => {
  it("saves the discount with its products and writes the audit log", async () => {
    const staff = await manager();
    const pid = await productId();
    const made = await create(staff.cookie, {
      name: "  Winter sale  ",
      percent: 25,
      markets: ["PK"],
      productIds: [pid],
    });

    expect(made.status).toBe(201);
    expect(made.body.discount).toMatchObject({
      name: "Winter sale",
      percent: 25,
      markets: ["PK"],
      active: true,
      status: "active",
      startsAt: null,
      endsAt: null,
      productCount: 1,
    });
    expect(made.body.discount.products).toEqual([
      expect.objectContaining({ id: pid, slug: DRESS }),
    ]);

    const [audit] = await sql<{
      staff_email: string;
      after: { percent: number };
    }>(
      "SELECT staff_email, after FROM audit_log WHERE action = 'discounts.create' AND entity_id = :id",
      { id: made.body.discount.id },
    );
    expect(audit.staff_email).toBe(staff.email);
    expect(audit.after.percent).toBe(25);
  });

  it("refuses bad input and fields it does not know", async () => {
    const staff = await manager();
    const pid = await productId();
    const ok = {
      name: "Sale",
      percent: 10,
      markets: ["PK"],
      productIds: [pid],
    };

    for (const body of [
      { ...ok, name: "   " },
      { ...ok, percent: 0 },
      { ...ok, percent: 91 },
      { ...ok, percent: 12.5 },
      { ...ok, markets: [] },
      { ...ok, markets: ["FR"] },
      { ...ok, markets: ["PK", "PK"] },
      { ...ok, productIds: [] },
      { ...ok, productIds: ["not-a-uuid"] },
      { ...ok, startsAt: "yesterday" },
      { ...ok, price: 5 },
    ]) {
      expect(
        (await create(staff.cookie, body)).status,
        JSON.stringify(body),
      ).toBe(400);
    }
    // An end before the start names the box.
    const dates = await create(staff.cookie, {
      ...ok,
      startsAt: inHours(48),
      endsAt: inHours(24),
    });
    expect(dates.status).toBe(400);
    expect(dates.body.error.fields.endsAt).toBeTruthy();
    // A product that does not exist is refused, nothing is saved.
    const missing = await create(staff.cookie, {
      ...ok,
      productIds: ["00000000-0000-4000-8000-000000000000"],
    });
    expect(missing.status).toBe(400);
    expect(missing.body.error.fields.productIds).toBeTruthy();
    expect((await list(staff.cookie)).body.items).toEqual([]);
  });

  it("changes only what is sent, and can replace the products", async () => {
    const staff = await manager();
    const id = await discountFor();
    const [second] = await sql<{ id: string }>(
      "SELECT id FROM products WHERE slug <> :slug AND deleted_at IS NULL ORDER BY slug LIMIT 1",
      { slug: DRESS },
    );

    const result = await change(staff.cookie, id, {
      percent: 30,
      productIds: [second.id],
    });

    expect(result.status).toBe(200);
    expect(result.body.discount).toMatchObject({
      name: "Winter sale",
      percent: 30,
      markets: ["PK", "DE"],
      productCount: 1,
    });
    expect(result.body.discount.products[0].id).toBe(second.id);
    expect((await change(staff.cookie, id, {})).status).toBe(400);
    expect((await change(staff.cookie, id, { markets: [] })).status).toBe(400);
    expect(
      (
        await change(staff.cookie, id, {
          endsAt: inHours(-5),
          startsAt: inHours(5),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await change(staff.cookie, "00000000-0000-4000-8000-000000000000", {
          percent: 5,
        })
      ).status,
    ).toBe(404);
  });

  it("lists with status and search filters", async () => {
    const staff = await manager();
    await discountFor({ name: "Always on" });
    await discountFor({ name: "Next month", startsAt: inHours(24 * 30) });
    await discountFor({
      name: "Last month",
      startsAt: inHours(-24 * 30),
      endsAt: inHours(-24 * 20),
    });
    await discountFor({ name: "Paused", active: false });

    const statusOf = async (query: string) =>
      (await list(staff.cookie, query)).body.items.map(
        (item: { name: string; status: string }) =>
          `${item.name}:${item.status}`,
      );

    expect(await statusOf("?status=active")).toEqual(["Always on:active"]);
    expect(await statusOf("?status=scheduled")).toEqual([
      "Next month:scheduled",
    ]);
    expect(await statusOf("?status=ended")).toEqual(["Last month:ended"]);
    expect(await statusOf("?status=off")).toEqual(["Paused:off"]);
    expect(await statusOf("?search=month")).toHaveLength(2);
    expect((await list(staff.cookie, "?status=nonsense")).status).toBe(400);
    expect((await list(staff.cookie)).body.total).toBe(4);
  });

  it("deletes a discount and the price goes back", async () => {
    const staff = await manager();
    const id = await discountFor();
    expect((await shownPrice("PK")).discountPercent).toBe(20);

    expect((await remove(staff.cookie, id)).status).toBe(204);

    expect((await get(staff.cookie, id)).status).toBe(404);
    expect((await shownPrice("PK")).discountPercent).toBeUndefined();
    expect((await remove(staff.cookie, id)).status).toBe(404);
    const [audit] = await sql<{ action: string }>(
      "SELECT action FROM audit_log WHERE action = 'discounts.delete' AND entity_id = :id",
      { id },
    );
    expect(audit.action).toBe("discounts.delete");
  });
});

describe("the price the shop shows", () => {
  it("shows the discounted price, the list price struck through, and the percent", async () => {
    const list = await listPrice("PK");
    await discountFor({ percent: 20, markets: ["PK"] });

    const price = await shownPrice("PK");

    expect(price.amount).toBe(Math.round((list * 80) / 100));
    expect(price.compareAtAmount).toBe(list);
    expect(price.discountPercent).toBe(20);
  });

  it("applies only in the chosen markets", async () => {
    const germany = await listPrice("DE");
    await discountFor({ markets: ["PK"] });

    const de = await shownPrice("DE");
    expect(de.amount).toBe(germany);
    expect(de.discountPercent).toBeUndefined();
    expect((await shownPrice("PK")).discountPercent).toBe(20);
  });

  it("applies only inside its dates, and never when switched off", async () => {
    const list = await listPrice("PK");
    const staff = await manager();
    const id = await discountFor({ startsAt: inHours(2) });
    expect((await shownPrice("PK")).amount).toBe(list); // not started

    await change(staff.cookie, id, {
      startsAt: inHours(-2),
      endsAt: inHours(2),
    });
    expect((await shownPrice("PK")).discountPercent).toBe(20); // running

    await change(staff.cookie, id, {
      startsAt: inHours(-5),
      endsAt: inHours(-1),
    });
    expect((await shownPrice("PK")).amount).toBe(list); // ended

    await change(staff.cookie, id, { endsAt: null, active: false });
    expect((await shownPrice("PK")).amount).toBe(list); // switched off

    await change(staff.cookie, id, { active: true });
    expect((await shownPrice("PK")).discountPercent).toBe(20); // on again
  });

  it("lets the bigger discount win instead of adding them up", async () => {
    const list = await listPrice("PK");
    await discountFor({ name: "Small", percent: 10 });
    await discountFor({ name: "Big", percent: 30 });

    const price = await shownPrice("PK");

    expect(price.discountPercent).toBe(30);
    expect(price.amount).toBe(Math.round((list * 70) / 100));
  });

  it("replaces an old price typed in by staff while the discount runs, and brings it back after", async () => {
    const pid = await productId();
    const [before] = await sql<{ compare_at_amount: string | null }>(
      "SELECT compare_at_amount FROM product_prices WHERE product_id = :pid AND market = 'PK'",
      { pid },
    );
    await exec(
      "UPDATE product_prices SET compare_at_amount = amount * 2 WHERE product_id = :pid AND market = 'PK'",
      { pid },
    );
    try {
      const list = await listPrice("PK");
      const staff = await manager();
      const id = await discountFor({ markets: ["PK"] });

      expect((await shownPrice("PK")).compareAtAmount).toBe(list);

      await change(staff.cookie, id, { active: false });
      expect((await shownPrice("PK")).compareAtAmount).toBe(list * 2);
    } finally {
      await exec(
        "UPDATE product_prices SET compare_at_amount = :old WHERE product_id = :pid AND market = 'PK'",
        { pid, old: before.compare_at_amount },
      );
    }
  });

  it("never lets the discounted price reach the list price or go below zero", async () => {
    const pid = await productId();
    const original = await listPrice("PK");
    await exec(
      "UPDATE product_prices SET amount = 1, compare_at_amount = NULL WHERE product_id = :pid AND market = 'PK'",
      { pid },
    );
    try {
      await discountFor({ percent: 10, markets: ["PK"] });

      // 10% of one paisa rounds back to one paisa: no discount at all.
      const price = await shownPrice("PK");
      expect(price.amount).toBe(1);
      expect(price.discountPercent).toBeUndefined();
    } finally {
      await exec(
        "UPDATE product_prices SET amount = :original WHERE product_id = :pid AND market = 'PK'",
        { pid, original },
      );
    }
  });
});

describe("the cart and orders", () => {
  it("shows the cart lines with the list price and the percent off", async () => {
    const list = await listPrice("PK");
    await discountFor({ percent: 20, markets: ["PK"] });
    const customer = await signUpCustomer();
    await addToCart(customer.cookie, await variantOf("S"), 2, "PK");

    const cart = await call(cartRoute, {
      method: "GET",
      cookie: customer.cookie,
      path: "/api/v1/cart?market=PK",
    });

    expect(cart.body.items[0].unitPrice).toMatchObject({
      amount: Math.round((list * 80) / 100),
      compareAtAmount: list,
      listAmount: list,
      discountPercent: 20,
    });
  });

  it("charges the discounted total, and keeps the list price and the discount on the order", async () => {
    const list = await listPrice("PK");
    await discountFor({ percent: 20, markets: ["PK"] });
    const sale = Math.round((list * 80) / 100);

    const placed = await placeTestOrder({ paymentMethod: "cod" });

    const [order] = await sql<{
      subtotal: string;
      discount_total: string;
      shipping_total: string;
      total: string;
    }>(
      "SELECT subtotal, discount_total, shipping_total, total FROM orders WHERE number = :n",
      { n: placed.number },
    );
    expect(Number(order.subtotal)).toBe(list);
    expect(Number(order.discount_total)).toBe(list - sale);
    expect(Number(order.total)).toBe(
      list - (list - sale) + Number(order.shipping_total),
    );
    expect(placed.total).toBe(Number(order.total));

    const [item] = await sql<{
      unit_amount: string;
      line_total: string;
      discount_amount: string;
      discount_percent: number;
    }>(
      `SELECT i.unit_amount, i.line_total, i.discount_amount, i.discount_percent
       FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.number = :n`,
      { n: placed.number },
    );
    expect(Number(item.unit_amount)).toBe(list);
    expect(Number(item.line_total)).toBe(list);
    expect(Number(item.discount_amount)).toBe(list - sale);
    expect(item.discount_percent).toBe(20);

    const mine = await call(orderRoute, {
      method: "GET",
      cookie: placed.customer.cookie,
      params: { number: placed.number },
    });
    expect(mine.body.order.discountTotal).toBe(list - sale);
  });

  it("keeps the price an order was placed at when the discount changes later", async () => {
    const list = await listPrice("PK");
    const staff = await manager();
    const id = await discountFor({ percent: 20, markets: ["PK"] });
    const placed = await placeTestOrder({ paymentMethod: "cod" });

    await change(staff.cookie, id, { percent: 50 });
    await remove(staff.cookie, id);

    const [order] = await sql<{ discount_total: string; total: string }>(
      "SELECT discount_total, total FROM orders WHERE number = :n",
      { n: placed.number },
    );
    expect(Number(order.discount_total)).toBe(
      list - Math.round((list * 80) / 100),
    );
    expect(Number(order.total)).toBe(placed.total);
  });

  it("has no discount on an order placed when none applies", async () => {
    const placed = await placeTestOrder({ paymentMethod: "cod" });
    const [order] = await sql<{ discount_total: string }>(
      "SELECT discount_total FROM orders WHERE number = :n",
      { n: placed.number },
    );
    expect(Number(order.discount_total)).toBe(0);
  });
});
