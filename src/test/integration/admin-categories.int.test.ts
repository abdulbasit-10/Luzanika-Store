import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  GET as listCategoriesRoute,
  POST as createCategoryRoute,
} from "@/app/api/v1/admin/categories/route";
import {
  DELETE as deleteCategoryRoute,
  GET as getCategoryRoute,
  PATCH as patchCategoryRoute,
} from "@/app/api/v1/admin/categories/[id]/route";
import { PUT as setCollectionsRoute } from "@/app/api/v1/admin/categories/[id]/collections/route";
import { POST as createSubcategoryRoute } from "@/app/api/v1/admin/categories/[id]/subcategories/route";
import {
  GET as listCollectionsRoute,
  POST as createCollectionRoute,
} from "@/app/api/v1/admin/collections/route";
import {
  DELETE as deleteCollectionRoute,
  PATCH as patchCollectionRoute,
} from "@/app/api/v1/admin/collections/[id]/route";
import { GET as homeRoute } from "@/app/api/v1/admin/home-sections/route";
import { PUT as setHomeRoute } from "@/app/api/v1/admin/home-sections/[section]/route";
import {
  DELETE as deleteSubcategoryRoute,
  PATCH as patchSubcategoryRoute,
} from "@/app/api/v1/admin/subcategories/[id]/route";
import { GET as publicCategoriesRoute } from "@/app/api/v1/categories/route";

import { signedInStaff } from "./admin-helpers";
import { call, exec, sql } from "./helpers";
import { importCatalog } from "./shop-helpers";

beforeAll(importCatalog);

// Everything these tests create has a "t7-" slug; it is removed again, and the home page is put back.
let homeBackup: { section: string; product_id: string; sort: number }[];
beforeEach(async () => {
  homeBackup = await sql("SELECT section, product_id, sort FROM home_features");
});
afterEach(async () => {
  await exec(
    "DELETE FROM category_collections WHERE category_id IN (SELECT id FROM categories WHERE slug LIKE 't7-%')",
  );
  await exec("DELETE FROM categories WHERE slug LIKE 't7-%'");
  await exec("DELETE FROM collections WHERE slug LIKE 't7-%'");
  await exec("DELETE FROM home_features");
  for (const row of homeBackup) {
    await exec(
      "INSERT INTO home_features (section, product_id, sort) VALUES (:section, :product_id, :sort)",
      row,
    );
  }
});

const manager = () => signedInStaff({ permissions: ["catalog.manage"] });
const reader = () => signedInStaff({ permissions: ["products.view"] });

const category = (overrides: Record<string, unknown> = {}) => ({
  slug: "t7-shoes",
  label: "Shoes",
  heroTitle: "Shoes Collection",
  title: "Shoes — Collection",
  description: "Everything for your feet.",
  heroImageSrc: "/images/categories/men-hero.jpg",
  heroImageAlt: "Shoes on a shelf",
  heroImagePosition: "50% 25%",
  allLabel: "ALL SHOES",
  filterSizes: ["40", "41", "42"],
  priceMin: 50_000,
  priceMax: 500_000,
  priceStep: 5_000,
  sort: 90,
  ...overrides,
});

const createCategory = (cookie: string | undefined, body: unknown) =>
  call(createCategoryRoute, { method: "POST", staffCookie: cookie, body });
const patchCategory = (cookie: string | undefined, id: string, body: unknown) =>
  call(patchCategoryRoute, {
    method: "PATCH",
    staffCookie: cookie,
    params: { id },
    body,
  });
const deleteCategory = (cookie: string | undefined, id: string) =>
  call(deleteCategoryRoute, {
    method: "DELETE",
    staffCookie: cookie,
    params: { id },
  });

describe("who may see and change the catalogue structure", () => {
  it("needs a signed-in staff member", async () => {
    const results = await Promise.all([
      call(listCategoriesRoute, { method: "GET" }),
      call(listCollectionsRoute, { method: "GET" }),
      call(homeRoute, { method: "GET" }),
      createCategory(undefined, category()),
    ]);
    for (const result of results) expect(result.status).toBe(401);
  });

  it("lets anyone who may view products (or manage the catalogue) read it, but only catalogue managers change it", async () => {
    const viewer = await reader();
    const manage = await manager();
    const other = await signedInStaff({ permissions: ["stock.view"] });

    for (const who of [viewer, manage]) {
      expect(
        (
          await call(listCategoriesRoute, {
            method: "GET",
            staffCookie: who.cookie,
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await call(listCollectionsRoute, {
            method: "GET",
            staffCookie: who.cookie,
          })
        ).status,
      ).toBe(200);
      expect(
        (await call(homeRoute, { method: "GET", staffCookie: who.cookie }))
          .status,
      ).toBe(200);
    }
    expect(
      (
        await call(listCategoriesRoute, {
          method: "GET",
          staffCookie: other.cookie,
        })
      ).status,
    ).toBe(403);

    const refused = await createCategory(viewer.cookie, category());
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe("forbidden");
    expect((await createCategory(manage.cookie, category())).status).toBe(201);
  });
});

describe("categories", () => {
  it("lists the sample categories with their subcategories, filter collections and product counts", async () => {
    const staff = await reader();

    const result = await call(listCategoriesRoute, {
      method: "GET",
      staffCookie: staff.cookie,
    });

    expect(result.status).toBe(200);
    const men = result.body.items.find(
      (item: { slug: string }) => item.slug === "men",
    );
    expect(men).toMatchObject({ label: "Men", allLabel: "ALL MEN" });
    expect(men.productCount).toBeGreaterThan(0);
    expect(men.subcategories.map((sub: { slug: string }) => sub.slug)).toEqual(
      expect.arrayContaining(["formal", "casual"]),
    );
    expect(men.collections.length).toBeGreaterThan(0);
    expect(men.priceRange.max).toBeGreaterThan(men.priceRange.min);
  });

  it("creates a category, which then shows on the public site", async () => {
    const staff = await manager();

    const result = await createCategory(staff.cookie, category());

    expect(result.status).toBe(201);
    expect(result.headers.get("location")).toBe(
      `/api/v1/admin/categories/${result.body.category.id}`,
    );
    expect(result.body.category).toMatchObject({
      slug: "t7-shoes",
      label: "Shoes",
      heroImage: {
        src: "/images/categories/men-hero.jpg",
        alt: "Shoes on a shelf",
        position: "50% 25%",
      },
      filterSizes: ["40", "41", "42"],
      priceRange: { min: 50_000, max: 500_000, step: 5_000 },
      productCount: 0,
      subcategories: [],
      collections: [],
    });

    const publicList = await call(publicCategoriesRoute, {
      method: "GET",
      path: "/api/v1/categories",
    });
    expect(JSON.stringify(publicList.body)).toContain("t7-shoes");
  });

  it("fills in the optional fields, and records the creation in the audit log", async () => {
    const staff = await manager();
    const {
      slug,
      label,
      heroTitle,
      title,
      description,
      heroImageSrc,
      allLabel,
      priceMin,
      priceMax,
      priceStep,
    } = category();

    const result = await createCategory(staff.cookie, {
      slug,
      label,
      heroTitle,
      title,
      description,
      heroImageSrc,
      allLabel,
      priceMin,
      priceMax,
      priceStep,
    });

    expect(result.status).toBe(201);
    expect(result.body.category).toMatchObject({
      filterSizes: [],
      sort: 0,
      heroImage: { alt: "", position: null },
    });
    const [audit] = await sql<{ staff_email: string; action: string }>(
      "SELECT staff_email, action FROM audit_log WHERE action = 'categories.create' ORDER BY id DESC LIMIT 1",
    );
    expect(audit).toEqual({
      staff_email: staff.email,
      action: "categories.create",
    });
  });

  it("refuses a slug that is taken, and bad values", async () => {
    const staff = await manager();
    await createCategory(staff.cookie, category());

    const taken = await createCategory(
      staff.cookie,
      category({ label: "Other" }),
    );
    expect(taken.status).toBe(409);
    expect(taken.body.error.fields.slug).toBeTruthy();

    const bad: Record<string, unknown>[] = [
      { slug: "Not A Slug" },
      { slug: "t7--double" },
      { slug: "" },
      { label: "  " },
      { heroImageSrc: "https://evil.example/x.jpg" },
      { heroImageSrc: "//evil.example/x.jpg" },
      { heroImageSrc: "/images/../secret.jpg" },
      { heroImagePosition: "javascript:alert(1)" },
      { priceMin: -1 },
      { priceMax: 1.5 },
      { priceStep: 0 },
      { filterSizes: ["M", "M"] },
      { filterSizes: Array.from({ length: 21 }, (_, i) => `S${i}`) },
      { extra: true },
    ];
    for (const overrides of bad) {
      expect(
        (
          await createCategory(
            staff.cookie,
            category({ slug: "t7-bad", ...overrides }),
          )
        ).status,
        JSON.stringify(overrides),
      ).toBe(400);
    }
    const none = await createCategory(staff.cookie, { slug: "t7-bad" });
    expect(none.status).toBe(400);
  });

  it("refuses a price range where the highest price is not above the lowest", async () => {
    const staff = await manager();

    const result = await createCategory(
      staff.cookie,
      category({ slug: "t7-range", priceMin: 1_000, priceMax: 1_000 }),
    );

    expect(result.status).toBe(400);
    expect(result.body.error.fields.priceMax).toBeTruthy();
  });

  it("changes only what is sent, and can clear the picture position", async () => {
    const staff = await manager();
    const created = (await createCategory(staff.cookie, category())).body
      .category;

    const result = await patchCategory(staff.cookie, created.id, {
      label: "Footwear",
      heroImagePosition: null,
      filterSizes: ["43"],
    });

    expect(result.status).toBe(200);
    expect(result.body.category).toMatchObject({
      label: "Footwear",
      slug: "t7-shoes",
      heroImage: { position: null, src: "/images/categories/men-hero.jpg" },
      filterSizes: ["43"],
      priceRange: { min: 50_000, max: 500_000 },
    });
    const [audit] = await sql<{
      before: { label: string };
      after: { label: string };
    }>(
      "SELECT before, after FROM audit_log WHERE action = 'categories.update' AND entity_id = :id",
      { id: created.id },
    );
    expect(audit.before.label).toBe("Shoes");
    expect(audit.after.label).toBe("Footwear");
  });

  it("checks the price range against what is already saved", async () => {
    const staff = await manager();
    const created = (await createCategory(staff.cookie, category())).body
      .category;

    const result = await patchCategory(staff.cookie, created.id, {
      priceMax: 40_000,
    });

    expect(result.status).toBe(400);
    expect(
      (
        await call(getCategoryRoute, {
          method: "GET",
          staffCookie: staff.cookie,
          params: { id: created.id },
        })
      ).body.category.priceRange.max,
    ).toBe(500_000);
  });

  it("refuses a slug another category has, and not found for a stranger", async () => {
    const staff = await manager();
    const created = (await createCategory(staff.cookie, category())).body
      .category;

    expect(
      (await patchCategory(staff.cookie, created.id, { slug: "men" })).status,
    ).toBe(409);
    expect(
      (await patchCategory(staff.cookie, "nope", { label: "x" })).status,
    ).toBe(404);
    expect(
      (await patchCategory(staff.cookie, crypto.randomUUID(), { label: "x" }))
        .status,
    ).toBe(404);
    expect(
      (await patchCategory(staff.cookie, created.id, { extra: 1 })).status,
    ).toBe(400);
  });

  it("deletes an empty category, but not one that products still belong to", async () => {
    const staff = await manager();
    const [men] = await sql<{ id: string }>(
      "SELECT id FROM categories WHERE slug = 'men'",
    );
    const created = (await createCategory(staff.cookie, category())).body
      .category;

    const refused = await deleteCategory(staff.cookie, men.id);
    expect(refused.status).toBe(409);
    expect(refused.body.error.message).toMatch(/products? still belong/);

    expect((await deleteCategory(staff.cookie, created.id)).status).toBe(204);
    expect((await deleteCategory(staff.cookie, created.id)).status).toBe(404);
    const [audit] = await sql<{ action: string }>(
      "SELECT action FROM audit_log WHERE action = 'categories.delete' AND entity_id = :id",
      { id: created.id },
    );
    expect(audit.action).toBe("categories.delete");
  });
});

describe("subcategories", () => {
  it("adds, renames and deletes a pill, with the same slug allowed in another category", async () => {
    const staff = await manager();
    const a = (await createCategory(staff.cookie, category({ slug: "t7-a" })))
      .body.category;
    const b = (await createCategory(staff.cookie, category({ slug: "t7-b" })))
      .body.category;

    const created = await call(createSubcategoryRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { id: a.id },
      body: { slug: "boots", label: "BOOTS", shortLabel: "Boots", sort: 1 },
    });
    expect(created.status).toBe(201);
    expect(created.body.subcategory).toMatchObject({
      slug: "boots",
      label: "BOOTS",
      shortLabel: "Boots",
      productCount: 0,
    });
    const id = created.body.subcategory.id;

    const sameInOther = await call(createSubcategoryRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { id: b.id },
      body: { slug: "boots", label: "BOOTS" },
    });
    expect(sameInOther.status).toBe(201);
    expect(sameInOther.body.subcategory.shortLabel).toBeNull();

    const twice = await call(createSubcategoryRoute, {
      method: "POST",
      staffCookie: staff.cookie,
      params: { id: a.id },
      body: { slug: "boots", label: "AGAIN" },
    });
    expect(twice.status).toBe(409);

    const renamed = await call(patchSubcategoryRoute, {
      method: "PATCH",
      staffCookie: staff.cookie,
      params: { id },
      body: { label: "ALL BOOTS", shortLabel: null },
    });
    expect(renamed.body.subcategory).toMatchObject({
      label: "ALL BOOTS",
      shortLabel: null,
      slug: "boots",
    });
    expect(
      (
        await call(getCategoryRoute, {
          method: "GET",
          staffCookie: staff.cookie,
          params: { id: a.id },
        })
      ).body.category.subcategories,
    ).toHaveLength(1);

    expect(
      (
        await call(deleteSubcategoryRoute, {
          method: "DELETE",
          staffCookie: staff.cookie,
          params: { id },
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await call(deleteSubcategoryRoute, {
          method: "DELETE",
          staffCookie: staff.cookie,
          params: { id },
        })
      ).status,
    ).toBe(404);
  });

  it("cannot be deleted while products belong to it", async () => {
    const staff = await manager();
    const [formal] = await sql<{ id: string }>(
      "SELECT s.id FROM subcategories s JOIN categories c ON c.id = s.category_id WHERE c.slug = 'men' AND s.slug = 'formal'",
    );

    const result = await call(deleteSubcategoryRoute, {
      method: "DELETE",
      staffCookie: staff.cookie,
      params: { id: formal.id },
    });

    expect(result.status).toBe(409);
    expect(result.body.error.message).toMatch(/products? still belong/);
  });

  it("refuses bad input and a category that does not exist", async () => {
    const staff = await manager();
    const a = (await createCategory(staff.cookie, category({ slug: "t7-a" })))
      .body.category;
    const add = (id: string, body: unknown) =>
      call(createSubcategoryRoute, {
        method: "POST",
        staffCookie: staff.cookie,
        params: { id },
        body,
      });

    expect((await add(a.id, { slug: "Bad Slug", label: "X" })).status).toBe(
      400,
    );
    expect((await add(a.id, { slug: "ok" })).status).toBe(400);
    expect((await add(a.id, { slug: "ok", label: "X", extra: 1 })).status).toBe(
      400,
    );
    expect(
      (await add(crypto.randomUUID(), { slug: "ok", label: "X" })).status,
    ).toBe(404);
    expect((await add("nope", { slug: "ok", label: "X" })).status).toBe(404);
  });
});

describe("collections (the sidebar Category filter)", () => {
  const createCollection = (cookie: string, body: unknown) =>
    call(createCollectionRoute, { method: "POST", staffCookie: cookie, body });

  it("creates, renames, lists and deletes a collection", async () => {
    const staff = await manager();

    const created = await createCollection(staff.cookie, {
      slug: "t7-vintage",
      label: "Vintage",
    });
    expect(created.status).toBe(201);
    const id = created.body.collection.id;
    expect(created.body.collection).toMatchObject({
      slug: "t7-vintage",
      label: "Vintage",
      productCount: 0,
    });

    expect(
      (
        await createCollection(staff.cookie, {
          slug: "t7-vintage",
          label: "Again",
        })
      ).status,
    ).toBe(409);
    expect(
      (await createCollection(staff.cookie, { slug: "Bad Slug", label: "x" }))
        .status,
    ).toBe(400);

    const renamed = await call(patchCollectionRoute, {
      method: "PATCH",
      staffCookie: staff.cookie,
      params: { id },
      body: { label: "Vintage Finds" },
    });
    expect(renamed.body.collection.label).toBe("Vintage Finds");
    const listed = await call(listCollectionsRoute, {
      method: "GET",
      staffCookie: staff.cookie,
    });
    expect(listed.body.items.map((item: { id: string }) => item.id)).toContain(
      id,
    );

    expect(
      (
        await call(deleteCollectionRoute, {
          method: "DELETE",
          staffCookie: staff.cookie,
          params: { id },
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await call(deleteCollectionRoute, {
          method: "DELETE",
          staffCookie: staff.cookie,
          params: { id },
        })
      ).status,
    ).toBe(404);
  });

  it("cannot be deleted while products are in it", async () => {
    const staff = await manager();
    const [used] = await sql<{ id: string }>(
      "SELECT collection_id AS id FROM products WHERE collection_id IS NOT NULL LIMIT 1",
    );

    const result = await call(deleteCollectionRoute, {
      method: "DELETE",
      staffCookie: staff.cookie,
      params: { id: used.id },
    });

    expect(result.status).toBe(409);
    expect(result.body.error.message).toMatch(/in this collection/);
  });

  it("chooses the filter choices of a category page, in order, replacing the old list", async () => {
    const staff = await manager();
    const cat = (await createCategory(staff.cookie, category())).body.category;
    const a = (
      await createCollection(staff.cookie, { slug: "t7-a", label: "A" })
    ).body.collection;
    const b = (
      await createCollection(staff.cookie, { slug: "t7-b", label: "B" })
    ).body.collection;
    const put = (ids: unknown) =>
      call(setCollectionsRoute, {
        method: "PUT",
        staffCookie: staff.cookie,
        params: { id: cat.id },
        body: { collectionIds: ids },
      });

    const first = await put([b.id, a.id]);
    expect(first.status).toBe(200);
    expect(
      first.body.category.collections.map((item: { id: string }) => item.id),
    ).toEqual([b.id, a.id]);

    const second = await put([a.id]);
    expect(
      second.body.category.collections.map((item: { id: string }) => item.id),
    ).toEqual([a.id]);
    expect((await put([])).body.category.collections).toEqual([]);

    expect((await put([a.id, a.id])).status).toBe(400);
    expect((await put([crypto.randomUUID()])).status).toBe(400);
    expect((await put("a")).status).toBe(400);
    expect(
      (
        await call(setCollectionsRoute, {
          method: "PUT",
          staffCookie: staff.cookie,
          params: { id: crypto.randomUUID() },
          body: { collectionIds: [] },
        })
      ).status,
    ).toBe(404);
  });
});

describe("the home page sections", () => {
  const products = async (n: number) =>
    (
      await sql<{ id: string; name: string }>(
        "SELECT id, name FROM products WHERE deleted_at IS NULL ORDER BY sort LIMIT :n",
        { n },
      )
    ).map((row) => row);
  const put = (cookie: string, section: string, productIds: unknown) =>
    call(setHomeRoute, {
      method: "PUT",
      staffCookie: cookie,
      params: { section },
      body: { productIds },
    });

  it("shows the three sections with their products in order", async () => {
    const staff = await reader();

    const result = await call(homeRoute, {
      method: "GET",
      staffCookie: staff.cookie,
    });

    expect(
      result.body.items.map((item: { section: string }) => item.section),
    ).toEqual(["featured", "new-arrivals", "special-offers"]);
    expect(result.body.items[0].products.length).toBeGreaterThan(0);
    expect(result.body.items[0].products[0]).toEqual({
      id: expect.any(String),
      slug: expect.any(String),
      name: expect.any(String),
    });
  });

  it("replaces a section with exactly these products in this order, and leaves the others alone", async () => {
    const staff = await manager();
    const [first, second, third] = await products(3);
    const before = await call(homeRoute, {
      method: "GET",
      staffCookie: staff.cookie,
    });
    const others = before.body.items.filter(
      (item: { section: string }) => item.section !== "featured",
    );

    const result = await put(staff.cookie, "featured", [
      third.id,
      first.id,
      second.id,
    ]);

    expect(result.status).toBe(200);
    const featured = result.body.items.find(
      (item: { section: string }) => item.section === "featured",
    );
    expect(featured.products.map((item: { id: string }) => item.id)).toEqual([
      third.id,
      first.id,
      second.id,
    ]);
    expect(
      result.body.items.filter(
        (item: { section: string }) => item.section !== "featured",
      ),
    ).toEqual(others);

    const [audit] = await sql<{ after: { productIds: string[] } }>(
      "SELECT after FROM audit_log WHERE action = 'home.update' ORDER BY id DESC LIMIT 1",
    );
    expect(audit.after.productIds).toEqual([third.id, first.id, second.id]);
  });

  it("can empty a section", async () => {
    const staff = await manager();

    const result = await put(staff.cookie, "special-offers", []);

    expect(
      result.body.items.find(
        (item: { section: string }) => item.section === "special-offers",
      ).products,
    ).toEqual([]);
  });

  it("refuses duplicates, products that do not exist, too many, and an unknown section", async () => {
    const staff = await manager();
    const [first] = await products(1);

    expect(
      (await put(staff.cookie, "featured", [first.id, first.id])).status,
    ).toBe(400);
    expect(
      (await put(staff.cookie, "featured", [crypto.randomUUID()])).status,
    ).toBe(400);
    expect((await put(staff.cookie, "featured", ["nope"])).status).toBe(400);
    expect(
      (
        await put(
          staff.cookie,
          "featured",
          Array.from({ length: 25 }, () => crypto.randomUUID()),
        )
      ).status,
    ).toBe(400);
    expect((await put(staff.cookie, "banner", [])).status).toBe(404);
  });
});
