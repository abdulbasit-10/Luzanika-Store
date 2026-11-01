import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DELETE as deleteAccount } from "@/app/api/v1/account/route";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { GET as getRoute } from "@/app/api/v1/wishlist/route";
import { POST as addRoute } from "@/app/api/v1/wishlist/items/route";
import { DELETE as removeRoute } from "@/app/api/v1/wishlist/items/[productId]/route";
import { importSampleCatalog } from "@/server/catalog/import-sample-catalog";

import { call, exec, newIp, sql, uniqueEmail } from "./helpers";

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

const list = (cookie: string | undefined) =>
  call(getRoute, { method: "GET", cookie });
const add = (cookie: string | undefined, productId: unknown) =>
  call(addRoute, { method: "POST", cookie, body: { productId } });
const remove = (cookie: string | undefined, productId: string) =>
  call(removeRoute, { method: "DELETE", cookie, params: { productId } });

async function productId(slug: string) {
  const [row] = await sql<{ id: string }>(
    "SELECT id FROM products WHERE slug = :slug",
    { slug },
  );
  return row.id;
}

const names = (body: { items: { name: string }[] }) =>
  body.items.map((item) => item.name);

let pool: pg.Pool;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  await importSampleCatalog(pool);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await exec("UPDATE products SET status = 'active', deleted_at = NULL");
});

describe("authentication", () => {
  it("every wishlist endpoint needs a signed-in customer", async () => {
    const id = crypto.randomUUID();
    const results = await Promise.all([
      list(undefined),
      add(undefined, id),
      remove(undefined, id),
    ]);
    for (const result of results) {
      expect(result.status).toBe(401);
      expect(result.body.error.code).toBe("unauthenticated");
    }
  });
});

describe("saving products", () => {
  it("starts empty, then lists a saved product with its card details", async () => {
    const { cookie } = await signUp();
    expect((await list(cookie)).body).toEqual({ items: [] });

    const id = await productId("classic-leather-tote-bag");
    const result = await add(cookie, id);

    expect(result.status).toBe(201);
    expect(result.headers.get("location")).toBe(`/api/v1/wishlist/items/${id}`);
    expect(result.body.items).toHaveLength(1);
    expect(result.body.items[0]).toMatchObject({
      id,
      slug: "classic-leather-tote-bag",
      name: "Classic Leather Tote Bag",
    });
    expect(result.body.items[0].image.src).toContain("/images/");
    expect(
      result.body.items[0].prices.map(
        (price: { region: string; currency: string }) => [
          price.region,
          price.currency,
        ],
      ),
    ).toEqual([
      ["PK", "PKR"],
      ["DE", "EUR"],
    ]);
    expect(Number.isNaN(Date.parse(result.body.items[0].addedAt))).toBe(false);
  });

  it("saving the same product twice keeps one entry", async () => {
    const { cookie } = await signUp();
    const id = await productId("classic-leather-tote-bag");
    await add(cookie, id);

    const again = await add(cookie, id);
    expect(again.status).toBe(201);
    expect(again.body.items).toHaveLength(1);
  });

  it("lists the newest first", async () => {
    const { cookie } = await signUp();
    await add(cookie, await productId("classic-leather-tote-bag"));
    await new Promise((resolve) => setTimeout(resolve, 15));
    await add(cookie, await productId("amber-oud-eau-de-parfum"));

    expect(names((await list(cookie)).body)).toEqual([
      "Amber Oud Eau de Parfum",
      "Classic Leather Tote Bag",
    ]);
  });

  it("removes a product, and removing it again is fine", async () => {
    const { cookie } = await signUp();
    const keep = await productId("classic-leather-tote-bag");
    const drop = await productId("amber-oud-eau-de-parfum");
    await add(cookie, keep);
    await add(cookie, drop);

    const first = await remove(cookie, drop);
    expect(first.status).toBe(200);
    expect(first.body.items.map((item: { id: string }) => item.id)).toEqual([
      keep,
    ]);
    expect((await remove(cookie, drop)).status).toBe(200);
  });

  it.each([
    ["a product that does not exist", () => crypto.randomUUID(), 404],
    ["an id that is not an id", () => "nope", 400],
    ["a missing id", () => undefined, 400],
    ["a number", () => 5, 400],
  ])("rejects %s", async (_label, make, status) => {
    const { cookie } = await signUp();
    expect((await add(cookie, make())).status).toBe(status);
  });

  it("rejects unexpected fields", async () => {
    const { cookie } = await signUp();
    const result = await call(addRoute, {
      method: "POST",
      cookie,
      body: {
        productId: await productId("classic-leather-tote-bag"),
        extra: 1,
      },
    });
    expect(result.status).toBe(400);
  });

  it("answers 404 when removing a malformed id", async () => {
    const { cookie } = await signUp();
    expect((await remove(cookie, "nope")).status).toBe(404);
  });

  it("can save a product that has a page but is not listed", async () => {
    const { cookie } = await signUp();
    const [row] = await sql<{ id: string }>(
      "SELECT id FROM products WHERE NOT listed LIMIT 1",
    );
    expect((await add(cookie, row.id)).status).toBe(201);
  });
});

describe("the size of a wishlist", () => {
  it("holds at most 200 products", async () => {
    const { cookie, id } = await signUp();
    await exec(
      "INSERT INTO products (slug, name) SELECT 'wl-' || g, 'Filler ' || g FROM generate_series(1, 200) g",
    );
    try {
      await exec(
        `INSERT INTO wishlist_items (customer_id, product_id)
         SELECT :id, p.id FROM products p WHERE p.slug LIKE 'wl-%'`,
        { id },
      );
      const extra = await productId("classic-leather-tote-bag");

      const refused = await add(cookie, extra);
      expect(refused.status).toBe(422);
      expect(refused.body.error.message).toContain("200");

      // Saving one that is already saved is still fine, and room appears after a removal.
      const [saved] = await sql<{ id: string }>(
        "SELECT id FROM products WHERE slug = 'wl-1'",
      );
      expect((await add(cookie, saved.id)).status).toBe(201);
      await remove(cookie, saved.id);
      expect((await add(cookie, extra)).status).toBe(201);
    } finally {
      await exec("DELETE FROM products WHERE slug LIKE 'wl-%'");
    }
  });
});
describe("products that stop being sold", () => {
  it("are left out of the list, and come back if the product returns", async () => {
    const { cookie } = await signUp();
    const id = await productId("classic-leather-tote-bag");
    await add(cookie, id);

    for (const change of [
      "status = 'draft'",
      "status = 'archived'",
      "deleted_at = now()",
    ]) {
      await exec(`UPDATE products SET ${change} WHERE id = :id`, { id });
      expect((await list(cookie)).body.items, change).toEqual([]);
      expect((await add(cookie, id)).status, change).toBe(404);
      await exec(
        "UPDATE products SET status = 'active', deleted_at = NULL WHERE id = :id",
        { id },
      );
    }

    expect(names((await list(cookie)).body)).toEqual([
      "Classic Leather Tote Bag",
    ]);
  });
});

describe("every customer has their own wishlist", () => {
  it("never shows or changes another customer's list", async () => {
    const ada = await signUp();
    const bob = await signUp();
    const id = await productId("classic-leather-tote-bag");
    await add(ada.cookie, id);

    expect((await list(bob.cookie)).body.items).toEqual([]);
    await remove(bob.cookie, id);
    expect((await list(ada.cookie)).body.items).toHaveLength(1);
  });

  it("is deleted with the account", async () => {
    const { cookie, id } = await signUp();
    await add(cookie, await productId("classic-leather-tote-bag"));

    const result = await call(deleteAccount, {
      method: "DELETE",
      cookie,
      body: { password: PASSWORD },
      ip: newIp(),
    });
    expect(result.status).toBe(204);
    expect(
      await sql("SELECT 1 FROM wishlist_items WHERE customer_id = :id", { id }),
    ).toHaveLength(0);
  });
});
