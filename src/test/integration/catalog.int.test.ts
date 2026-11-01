import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as getCategories } from "@/app/api/v1/categories/route";
import { GET as getCategory } from "@/app/api/v1/categories/[slug]/route";
import { GET as getProductList } from "@/app/api/v1/products/route";
import { GET as getProductBySlug } from "@/app/api/v1/products/[slug]/route";
import { importSampleCatalog } from "@/server/catalog/import-sample-catalog";
import {
  getCatalog as sampleCatalog,
  listCategorySlugs,
} from "@/server/catalog/sample/mock-catalog";
import { detailedProducts } from "@/server/catalog/sample/mock-product-details";
import {
  mockFeaturedProducts,
  mockNewArrivals,
  mockSpecialOffers,
} from "@/server/catalog/sample/mock-products";
import { getProductListing as sampleListing } from "@/server/catalog/sample/product-listing";
import {
  getProduct as sampleProduct,
  listProductSlugs as sampleSlugs,
} from "@/server/catalog/sample/product-service";
import { catalogService } from "@/server/services/catalog-service";

import { call, exec, sql } from "./helpers";

/** Drops `undefined` fields and database ids, so shapes can be compared. */
function plain<T>(value: T, omit: string[] = []): unknown {
  return JSON.parse(
    JSON.stringify(value, (key, item) =>
      omit.includes(key) ? undefined : item,
    ),
  );
}

const designed = new Map(detailedProducts.map((item) => [item.slug, item]));

/**
 * The one product that has both a listing card and a designed page. The
 * designed page is the better data, so the database holds it and the card
 * shows it (this is the only intended difference from the sample cards).
 */
function withDesignedFields<T extends { slug: string }>(card: T): T {
  const page = designed.get(card.slug);
  if (!page) return card;
  return {
    ...card,
    prices: page.prices,
    sizes: page.sizes,
    colors: page.colors,
    rating: page.rating,
    isNew: page.isNew,
    image: page.images[0],
  };
}

let pool: pg.Pool;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  await importSampleCatalog(pool);
});

afterAll(async () => {
  await pool.end();
});

describe("catalogue matches the sample data it was imported from", () => {
  it("every category page: definition, filter choices and products", async () => {
    for (const slug of listCategorySlugs()) {
      const expected = sampleCatalog(slug)!;
      const actual = await catalogService.getCatalog(slug);

      expect(plain(actual?.category), slug).toEqual(plain(expected.category));
      expect(plain(actual?.facets), slug).toEqual(plain(expected.facets));
      expect(plain(actual?.products, ["id"]), `${slug} products`).toEqual(
        plain(expected.products.map(withDesignedFields), ["id"]),
      );
    }
  });

  it("the all-products page: facets, order and products", async () => {
    const expected = sampleListing();
    const actual = await catalogService.getProductListing();

    expect(plain(actual.facets)).toEqual(plain(expected.facets));
    expect(plain(actual.products, ["id"])).toEqual(
      plain(expected.products.map(withDesignedFields), ["id", "subcategory"]),
    );
  });

  it("the home page sections", async () => {
    const home = await catalogService.getHomeProducts();

    expect(plain(home.featured, ["id"])).toEqual(
      plain(mockFeaturedProducts, ["id"]),
    );
    expect(plain(home.newArrivals, ["id"])).toEqual(
      plain(mockNewArrivals, ["id"]),
    );
    expect(plain(home.specialOffers, ["id"])).toEqual(
      plain(mockSpecialOffers, ["id"]),
    );
  });

  it("every product page, with a variant for each colour and size", async () => {
    const slugs = sampleSlugs();
    expect(slugs).toHaveLength(46);

    for (const slug of slugs) {
      const expected = { ...sampleProduct(slug)! };
      // Its breadcrumb said "Unisex", which is not a subcategory of Fragrances.
      if (slug === "amber-oud-eau-de-parfum") delete expected.subcategoryLabel;
      const actual = await catalogService.getProduct(slug);
      expect(actual, slug).toBeDefined();

      const comparable = (page: typeof actual) => ({
        ...page,
        isNew: Boolean(page?.isNew),
        hasSizeGuide: Boolean(page?.hasSizeGuide),
      });
      expect(plain(comparable(actual), ["id", "variants"]), slug).toEqual(
        plain(comparable(expected as never), [
          "id",
          "stock",
          "viewersNow",
          "variants",
        ]),
      );

      const colors = expected.colors?.length ?? 0;
      const sizes = expected.sizes?.length ?? 0;
      expect(actual!.variants, slug).toHaveLength(
        Math.max(colors, 1) * Math.max(sizes, 1),
      );
      for (const variant of actual!.variants) {
        expect(variant.stock, slug).toEqual({ PK: 25, DE: 25 });
      }
    }
  });

  it("lists the same product slugs", async () => {
    expect((await catalogService.listProductSlugs()).sort()).toEqual(
      sampleSlugs().sort(),
    );
  });
});

describe("importing again", () => {
  it("adds nothing and never resets stock or edits", async () => {
    const [variant] = await sql<{ id: string }>(
      "SELECT id FROM product_variants ORDER BY sku LIMIT 1",
    );
    await exec(
      "UPDATE inventory SET on_hand = 7 WHERE variant_id = :id AND market = 'PK'",
      { id: variant.id },
    );
    await exec("UPDATE products SET name = 'Renamed' WHERE slug = :slug", {
      slug: "relaxed-linen-pleated-trouser",
    });
    const movements = await sql<{ count: string }>(
      "SELECT count(*) FROM stock_movements",
    );

    const summary = await importSampleCatalog(pool);

    expect(summary).toEqual({
      categories: 0,
      products: 0,
      variants: 0,
      homeFeatures: 0,
    });
    const [stock] = await sql<{ on_hand: number }>(
      "SELECT on_hand FROM inventory WHERE variant_id = :id AND market = 'PK'",
      { id: variant.id },
    );
    expect(stock.on_hand).toBe(7);
    const [product] = await sql<{ name: string }>(
      "SELECT name FROM products WHERE slug = 'relaxed-linen-pleated-trouser'",
    );
    expect(product.name).toBe("Renamed");
    expect(
      (await sql<{ count: string }>("SELECT count(*) FROM stock_movements"))[0]
        .count,
    ).toBe(movements[0].count);

    await exec(
      "UPDATE inventory SET on_hand = 25 WHERE variant_id = :id AND market = 'PK'",
      { id: variant.id },
    );
    await exec("UPDATE products SET name = :name WHERE slug = :slug", {
      slug: "relaxed-linen-pleated-trouser",
      name: sampleProduct("relaxed-linen-pleated-trouser")!.name,
    });
  });

  it("records the starting stock of every variant in the ledger", async () => {
    const [row] = await sql<{ missing: string }>(
      `SELECT count(*) AS missing FROM inventory i
       WHERE NOT EXISTS (
         SELECT 1 FROM stock_movements m
         WHERE m.variant_id = i.variant_id AND m.market = i.market AND m.reason = 'initial_import')`,
    );
    expect(row.missing).toBe("0");
  });
});

describe("what shoppers can see", () => {
  const unlisted = detailedProducts
    .filter(
      (item) => !sampleListing().products.some((p) => p.slug === item.slug),
    )
    .map((item) => item.slug);

  it("keeps unlisted products out of lists but reachable by address", async () => {
    expect(unlisted.length).toBeGreaterThan(0);
    const listing = await catalogService.getProductListing();
    const slug = unlisted[0];

    expect(listing.products.some((item) => item.slug === slug)).toBe(false);
    expect(await catalogService.getProduct(slug)).toBeDefined();
  });

  it("hides drafts and deleted products everywhere", async () => {
    const slug = "relaxed-linen-pleated-trouser";
    for (const change of [
      "status = 'draft'",
      "status = 'archived'",
      "deleted_at = now()",
    ]) {
      await exec(`UPDATE products SET ${change} WHERE slug = :slug`, { slug });

      expect(await catalogService.getProduct(slug), change).toBeUndefined();
      expect(await catalogService.listProductSlugs(), change).not.toContain(
        slug,
      );
      const men = await catalogService.getCatalog("men");
      expect(
        men!.products.some((item) => item.slug === slug),
        change,
      ).toBe(false);
      const listing = await catalogService.getProductListing();
      expect(
        listing.products.some((item) => item.slug === slug),
        change,
      ).toBe(false);

      await exec(
        "UPDATE products SET status = 'active', deleted_at = NULL WHERE slug = :slug",
        { slug },
      );
    }
  });

  it("reports stock that is on hand minus reserved, per market", async () => {
    const slug = "relaxed-linen-pleated-trouser";
    const [variant] = await sql<{ id: string }>(
      `SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id
       WHERE p.slug = :slug ORDER BY v.sort LIMIT 1`,
      { slug },
    );
    await exec(
      "UPDATE inventory SET on_hand = 5, reserved = 2 WHERE variant_id = :id AND market = 'PK'",
      { id: variant.id },
    );
    await exec(
      "UPDATE inventory SET on_hand = 0 WHERE variant_id = :id AND market = 'DE'",
      { id: variant.id },
    );

    const page = await catalogService.getProduct(slug);
    expect(page!.variants[0].stock).toEqual({ PK: 3, DE: 0 });

    await exec(
      "UPDATE inventory SET on_hand = 25, reserved = 0 WHERE variant_id = :id",
      { id: variant.id },
    );
  });

  it("leaves out a variant that was switched off", async () => {
    const slug = "relaxed-linen-pleated-trouser";
    const before = await catalogService.getProduct(slug);
    await exec("UPDATE product_variants SET active = false WHERE id = :id", {
      id: before!.variants[0].id,
    });

    const after = await catalogService.getProduct(slug);
    expect(after!.variants).toHaveLength(before!.variants.length - 1);

    await exec("UPDATE product_variants SET active = true WHERE id = :id", {
      id: before!.variants[0].id,
    });
  });
});

describe("GET /api/v1 catalogue", () => {
  it("lists the categories", async () => {
    const response = await call(getCategories, {
      method: "GET",
      path: "/api/v1/categories",
    });

    expect(response.status).toBe(200);
    expect(
      response.body.items.map((item: { slug: string }) => item.slug),
    ).toEqual(listCategorySlugs());
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
  });

  it("returns one category page", async () => {
    const response = await call(getCategory, {
      method: "GET",
      path: "/api/v1/categories/men",
      params: { slug: "men" },
    });

    expect(response.status).toBe(200);
    expect(response.body.category.slug).toBe("men");
    expect(response.body.products.length).toBeGreaterThan(0);
  });

  it.each(["nope", "Men", "../etc", "a--b", "x".repeat(200)])(
    "answers 404 for the category %s",
    async (slug) => {
      const response = await call(getCategory, {
        method: "GET",
        path: "/api/v1/categories/x",
        params: { slug },
      });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("not_found");
    },
  );

  it("returns the all-products page", async () => {
    const response = await call(getProductList, {
      method: "GET",
      path: "/api/v1/products",
    });

    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(42);
    expect(response.body.facets.collections).toHaveLength(5);
  });

  it("returns a product with prices in both markets and per-variant stock", async () => {
    const response = await call(getProductBySlug, {
      method: "GET",
      path: "/api/v1/products/classic-leather-tote-bag",
      params: { slug: "classic-leather-tote-bag" },
    });

    expect(response.status).toBe(200);
    expect(response.body.slug).toBe("classic-leather-tote-bag");
    expect(
      response.body.prices.map(
        (price: { region: string; currency: string }) => [
          price.region,
          price.currency,
        ],
      ),
    ).toEqual([
      ["PK", "PKR"],
      ["DE", "EUR"],
    ]);
    expect(Number.isInteger(response.body.prices[0].amount)).toBe(true);
    expect(response.body.variants[0].stock).toEqual({ PK: 25, DE: 25 });
    expect(response.body.variants[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each(["no-such-product", "UPPER", "a b", "'; drop table products;--"])(
    "answers 404 for the product %s",
    async (slug) => {
      const response = await call(getProductBySlug, {
        method: "GET",
        path: "/api/v1/products/x",
        params: { slug },
      });

      expect(response.status).toBe(404);
    },
  );
});
