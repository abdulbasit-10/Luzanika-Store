import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DELETE as deleteAccountRoute } from "@/app/api/v1/account/route";
import { GET as adminListRoute } from "@/app/api/v1/admin/reviews/route";
import { POST as hideRoute } from "@/app/api/v1/admin/reviews/[id]/hide/route";
import { POST as restoreRoute } from "@/app/api/v1/admin/reviews/[id]/restore/route";
import {
  GET as offerGetRoute,
  PUT as offerPutRoute,
} from "@/app/api/v1/admin/home-offer/route";
import {
  GET as listRoute,
  POST as createRoute,
} from "@/app/api/v1/products/[slug]/reviews/route";
import {
  DELETE as deleteRoute,
  PATCH as updateRoute,
} from "@/app/api/v1/reviews/[id]/route";
import { catalogService } from "@/server/services/catalog-service";

import { signedInStaff } from "./admin-helpers";
import { call, exec, sql } from "./helpers";
import {
  CUSTOMER_PASSWORD,
  DRESS,
  importCatalog,
  placeTestOrder,
  resetShopData,
  signUpCustomer,
  type TestCustomer,
} from "./shop-helpers";

beforeAll(importCatalog);
beforeEach(async () => {
  await resetShopData();
  await exec("DELETE FROM product_reviews");
  await exec("UPDATE products SET rating_avg = NULL, rating_count = 0");
  await exec("UPDATE home_offer SET ends_at = NULL, headline = NULL");
});

const good = {
  rating: 5,
  title: "Lovely",
  body: "Soft, warm and exactly as described. Fits true to size.",
};

const read = (customer?: TestCustomer, query = "") =>
  call(listRoute, {
    method: "GET",
    cookie: customer?.cookie,
    params: { slug: DRESS },
    path: `/api/v1/products/${DRESS}/reviews${query}`,
  });
const write = (customer: TestCustomer | undefined, body: unknown = good) =>
  call(createRoute, {
    method: "POST",
    cookie: customer?.cookie,
    params: { slug: DRESS },
    body,
  });
const change = (customer: TestCustomer, id: string, body: unknown = good) =>
  call(updateRoute, {
    method: "PATCH",
    cookie: customer.cookie,
    params: { id },
    body,
  });
const remove = (customer: TestCustomer, id: string) =>
  call(deleteRoute, {
    method: "DELETE",
    cookie: customer.cookie,
    params: { id },
  });

/** A customer whose order for the dress was delivered. */
async function buyer(): Promise<TestCustomer> {
  const placed = await placeTestOrder({ paymentMethod: "cod" });
  await exec(
    "UPDATE orders SET status = 'completed', completed_at = now() WHERE number = :number",
    { number: placed.number },
  );
  return placed.customer;
}

async function productRating() {
  const [row] = await sql<{ rating_avg: string | null; rating_count: number }>(
    "SELECT rating_avg, rating_count FROM products WHERE slug = :slug",
    { slug: DRESS },
  );
  return {
    average: row.rating_avg === null ? null : Number(row.rating_avg),
    count: row.rating_count,
  };
}

describe("who may review", () => {
  it("lets anyone read, and tells each visitor what they may do", async () => {
    const visitor = await read();
    expect(visitor.status).toBe(200);
    expect(visitor.body.summary).toEqual({
      average: null,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
    expect(visitor.body.viewer.state).toBe("sign_in");

    const newcomer = await signUpCustomer();
    expect((await read(newcomer)).body.viewer.state).toBe("needs_purchase");

    const placed = await placeTestOrder({ paymentMethod: "cod" });
    // Ordered but not yet delivered: still not allowed.
    expect((await read(placed.customer)).body.viewer.state).toBe(
      "needs_purchase",
    );
    expect((await write(placed.customer)).status).toBe(403);

    await exec("UPDATE orders SET status = 'completed' WHERE number = :n", {
      n: placed.number,
    });
    expect((await read(placed.customer)).body.viewer.state).toBe("can_review");
  });

  it("does not count a refunded or cancelled order as a purchase", async () => {
    const placed = await placeTestOrder({ paymentMethod: "cod" });
    await exec("UPDATE orders SET status = 'refunded' WHERE number = :n", {
      n: placed.number,
    });
    expect((await write(placed.customer)).status).toBe(403);
    await exec(
      "UPDATE orders SET status = 'cancelled', cancelled_at = now(), stock_state = 'released' WHERE number = :n",
      {
        n: placed.number,
      },
    );
    expect((await write(placed.customer)).status).toBe(403);
  });

  it("needs a signed-in customer and an unknown product is not found", async () => {
    expect((await write(undefined)).status).toBe(401);
    const missing = await call(listRoute, {
      method: "GET",
      params: { slug: "no-such-product" },
    });
    expect(missing.status).toBe(404);
  });
});

describe("writing, changing and removing a review", () => {
  it("refuses bad ratings, short text and unknown fields", async () => {
    const customer = await buyer();
    for (const body of [
      { ...good, rating: 0 },
      { ...good, rating: 6 },
      { ...good, rating: 2.5 },
      { ...good, rating: "5" },
      { body: good.body },
      { ...good, body: "Nice" },
      { ...good, body: "x".repeat(2001) },
      { ...good, title: "t".repeat(81) },
      { ...good, verified: true },
    ]) {
      expect((await write(customer, body)).status).toBe(400);
    }
    expect((await read()).body.summary.count).toBe(0);
  });

  it("publishes a review under the first name and last initial, once per product", async () => {
    const customer = await buyer();
    const made = await write(customer);
    expect(made.status).toBe(201);
    expect(made.body.review.authorName).toBe("Ada L.");
    expect((await write(customer)).status).toBe(409);

    const shown = await read();
    expect(shown.body.summary.count).toBe(1);
    expect(shown.body.summary.average).toBe(5);
    expect(shown.body.items[0].verifiedPurchase).toBe(true);
    // Nothing that identifies the customer is public.
    expect(JSON.stringify(shown.body)).not.toMatch(/email|customer/i);
    expect((await read(customer)).body.viewer).toMatchObject({
      state: "already_reviewed",
      mine: { id: made.body.review.id },
    });
  });

  it("keeps the product's rating equal to the average of its published reviews", async () => {
    const first = await buyer();
    const second = await buyer();
    expect(await productRating()).toEqual({ average: null, count: 0 });

    const a = await write(first, { ...good, rating: 5 });
    expect(await productRating()).toEqual({ average: 5, count: 1 });
    const b = await write(second, { ...good, rating: 2 });
    expect(await productRating()).toEqual({ average: 3.5, count: 2 });

    await change(first, a.body.review.id, { ...good, rating: 4 });
    expect(await productRating()).toEqual({ average: 3, count: 2 });

    expect((await remove(second, b.body.review.id)).status).toBe(204);
    expect(await productRating()).toEqual({ average: 4, count: 1 });
    expect((await remove(first, a.body.review.id)).status).toBe(204);
    expect(await productRating()).toEqual({ average: null, count: 0 });
  });

  it("lets only the author change or remove a review", async () => {
    const author = await buyer();
    const other = await buyer();
    const made = await write(author);
    const id = made.body.review.id as string;

    expect((await change(other, id)).status).toBe(404);
    expect((await remove(other, id)).status).toBe(404);
    expect((await change(author, "not-a-uuid")).status).toBe(404);
    expect((await change(author, id, { ...good, rating: 9 })).status).toBe(400);
    expect((await read()).body.summary.count).toBe(1);
  });

  it("pages through the reviews, newest first", async () => {
    for (let i = 0; i < 3; i++)
      await write(await buyer(), { ...good, title: `Review ${i}` });
    const page = await read(undefined, "?pageSize=2&page=1");
    expect(page.body.items).toHaveLength(2);
    expect(page.body.total).toBe(3);
    expect(page.body.items[0].title).toBe("Review 2");
    expect((await read(undefined, "?pageSize=500")).status).toBe(400);
  });

  it("keeps a review under 'Former customer' when the customer deletes their account", async () => {
    const customer = await buyer();
    await write(customer);
    const deleted = await call(deleteAccountRoute, {
      method: "DELETE",
      cookie: customer.cookie,
      body: { password: CUSTOMER_PASSWORD },
    });
    expect(deleted.status).toBe(204);
    const shown = await read();
    expect(shown.body.items).toHaveLength(1);
    expect(shown.body.items[0].authorName).toBe("Former customer");
  });
});

describe("staff moderation", () => {
  const list = (cookie: string | undefined, query = "") =>
    call(adminListRoute, {
      method: "GET",
      staffCookie: cookie,
      path: `/api/v1/admin/reviews${query}`,
    });
  const hide = (
    cookie: string | undefined,
    id: string,
    body: unknown = { reason: "Spam" },
  ) =>
    call(hideRoute, {
      method: "POST",
      staffCookie: cookie,
      params: { id },
      body,
    });
  const restore = (cookie: string | undefined, id: string) =>
    call(restoreRoute, {
      method: "POST",
      staffCookie: cookie,
      params: { id },
      body: {},
    });

  it("lets viewing and moderating be given separately", async () => {
    const customer = await buyer();
    const id = (await write(customer)).body.review.id as string;
    const seeOnly = await signedInStaff({ permissions: ["reviews.view"] });
    const moderateOnly = await signedInStaff({
      permissions: ["reviews.moderate"],
    });

    expect((await list(undefined)).status).toBe(401);
    expect((await list(seeOnly.cookie)).status).toBe(200);
    expect((await list(moderateOnly.cookie)).status).toBe(403);
    expect((await hide(seeOnly.cookie, id)).status).toBe(403);
    expect((await restore(seeOnly.cookie, id)).status).toBe(403);
    expect((await hide(moderateOnly.cookie, id)).status).toBe(200);
  });

  it("hides a review from the shop and the rating, and shows it again, with an audit trail", async () => {
    const customer = await buyer();
    const id = (await write(customer, { ...good, rating: 4 })).body.review
      .id as string;
    const staff = await signedInStaff({
      permissions: ["reviews.view", "reviews.moderate"],
    });

    expect((await hide(staff.cookie, id, {})).status).toBe(400);
    const hidden = await hide(staff.cookie, id, { reason: "Personal details" });
    expect(hidden.status).toBe(200);
    expect(hidden.body.review.status).toBe("hidden");
    expect((await hide(staff.cookie, id)).status).toBe(409);

    expect((await read()).body.summary.count).toBe(0);
    expect(await productRating()).toEqual({ average: null, count: 0 });
    // The author still sees theirs, marked hidden, and cannot edit it or write another.
    expect((await read(customer)).body.viewer.mine.status).toBe("hidden");
    expect((await change(customer, id)).status).toBe(409);
    expect((await write(customer)).status).toBe(409);

    const hiddenList = await list(staff.cookie, "?status=hidden");
    expect(hiddenList.body.items).toHaveLength(1);
    expect(hiddenList.body.items[0].hiddenReason).toBe("Personal details");

    expect((await restore(staff.cookie, id)).body.review.status).toBe(
      "published",
    );
    expect((await restore(staff.cookie, id)).status).toBe(409);
    expect(await productRating()).toEqual({ average: 4, count: 1 });

    const audit = await sql<{ action: string }>(
      "SELECT action FROM audit_log WHERE entity_type = 'review' AND entity_id = :id ORDER BY id",
      { id },
    );
    expect(audit.map((row) => row.action)).toEqual([
      "reviews.hide",
      "reviews.restore",
    ]);
  });

  it("filters the list", async () => {
    const staff = await signedInStaff({ permissions: ["reviews.view"] });
    await write(await buyer(), {
      ...good,
      rating: 5,
      body: "Wonderful fabric indeed",
    });
    await write(await buyer(), {
      ...good,
      rating: 2,
      body: "The seams came apart quickly",
    });
    expect((await list(staff.cookie, "?rating=2")).body.items).toHaveLength(1);
    expect((await list(staff.cookie, "?search=seams")).body.items).toHaveLength(
      1,
    );
    expect(
      (await list(staff.cookie, "?status=hidden")).body.items,
    ).toHaveLength(0);
    expect((await list(staff.cookie, "?rating=9")).status).toBe(400);
  });
});

describe("the special offer row", () => {
  const set = (cookie: string | undefined, body: unknown) =>
    call(offerPutRoute, { method: "PUT", staffCookie: cookie, body });

  it("is set by staff with the catalogue permission, with an end time and a headline", async () => {
    const maker = await signedInStaff({ permissions: ["catalog.manage"] });
    const viewer = await signedInStaff({ permissions: ["products.view"] });
    const future = new Date(Date.now() + 3_600_000).toISOString();

    expect(
      (await set(undefined, { endsAt: future, headline: null })).status,
    ).toBe(401);
    expect(
      (await set(viewer.cookie, { endsAt: future, headline: null })).status,
    ).toBe(403);
    const saved = await set(maker.cookie, {
      endsAt: future,
      headline: "  Winter Sale  ",
    });
    expect(saved.status).toBe(200);
    expect(saved.body.offer.headline).toBe("Winter Sale");
    expect(new Date(saved.body.offer.endsAt).getTime()).toBe(
      new Date(future).getTime(),
    );

    const got = await call(offerGetRoute, {
      method: "GET",
      staffCookie: viewer.cookie,
    });
    expect(got.body.offer.headline).toBe("Winter Sale");
    expect(
      (await set(maker.cookie, { endsAt: null, headline: null })).body.offer,
    ).toEqual({
      endsAt: null,
      headline: null,
    });
  });

  it("refuses a bad time, a long headline and a typed-in percentage", async () => {
    const maker = await signedInStaff({ permissions: ["catalog.manage"] });
    for (const body of [
      { endsAt: "tomorrow", headline: null },
      { endsAt: null, headline: "h".repeat(81) },
      { endsAt: null, headline: null, percent: 50 },
      { headline: null },
    ]) {
      expect((await set(maker.cookie, body)).status).toBe(400);
    }
  });

  it("leaves the offered products out of the shop once the end time has passed", async () => {
    const maker = await signedInStaff({ permissions: ["catalog.manage"] });
    const withProducts = await catalogService.getHomeProducts();
    // The sample catalogue puts products in the offers row.
    expect(withProducts.specialOffers.length).toBeGreaterThan(0);
    expect(withProducts.offer).toEqual({ endsAt: null, headline: null });

    await set(maker.cookie, {
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
      headline: "Sale",
    });
    const running = await catalogService.getHomeProducts();
    expect(running.specialOffers.length).toBe(
      withProducts.specialOffers.length,
    );
    expect(running.offer.headline).toBe("Sale");

    await set(maker.cookie, {
      endsAt: new Date(Date.now() - 60_000).toISOString(),
      headline: "Sale",
    });
    const over = await catalogService.getHomeProducts();
    expect(over.specialOffers).toEqual([]);
    // The other rows are not affected.
    expect(over.featured.length).toBe(withProducts.featured.length);
  });
});
