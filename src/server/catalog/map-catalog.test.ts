import { describe, expect, it } from "vitest";

import type {
  CategoryRow,
  ProductParts,
  ProductRow,
  VariantRow,
} from "@/server/repositories/catalog-repository";
import { isSlug } from "@/server/validation/catalog-schemas";

import {
  distinctOptions,
  toListedProduct,
  toListingFacets,
  toProductDetail,
  toSummary,
} from "./map-catalog";

function product(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "p1",
    slug: "linen-shirt",
    name: "Linen Shirt",
    tagline: null,
    availability: null,
    badge_label: null,
    badge_tone: null,
    is_new: false,
    rating_avg: null,
    rating_count: 0,
    notes: [],
    has_size_guide: false,
    category_slug: null,
    category_label: null,
    subcategory_slug: null,
    subcategory_label: null,
    subcategory_short_label: null,
    collection_slug: null,
    collection_label: null,
    ...overrides,
  };
}

function variant(
  id: string,
  color: string | null,
  size: string | null,
): VariantRow {
  return {
    id,
    product_id: "p1",
    color_name: color,
    color_hex: color ? "#112233" : null,
    size_label: size,
  };
}

const parts: ProductParts = {
  prices: [
    {
      product_id: "p1",
      market: "PK",
      currency: "PKR",
      amount: "85000",
      compare_at_amount: "99000",
      discount_percent: null,
    },
    {
      product_id: "p1",
      market: "DE",
      currency: "EUR",
      amount: "8500",
      compare_at_amount: null,
      discount_percent: null,
    },
  ],
  images: [
    { product_id: "p1", src: "/a.jpg", alt: "A", position: "50% 0%" },
    { product_id: "p1", src: "/b.jpg", alt: "B", position: null },
  ],
  variants: [
    variant("v1", "Black", "S"),
    variant("v2", "Black", "M"),
    variant("v3", "Red", "S"),
    variant("v4", "Red", "M"),
  ],
};

describe("distinctOptions", () => {
  it("lists each colour and size once, in variant order", () => {
    const { colors, sizes } = distinctOptions(parts.variants);

    expect(colors?.map((color) => color.name)).toEqual(["Black", "Red"]);
    expect(sizes).toEqual(["S", "M"]);
  });

  it("leaves them out for a product without colours or sizes", () => {
    expect(distinctOptions([variant("v1", null, null)])).toEqual({
      colors: undefined,
      sizes: undefined,
    });
  });
});

describe("toSummary", () => {
  it("turns database text numbers into money in minor units", () => {
    const summary = toSummary(product({ rating_avg: "4.8" }), parts);

    expect(summary.prices).toEqual([
      { region: "PK", currency: "PKR", amount: 85000, compareAtAmount: 99000 },
      { region: "DE", currency: "EUR", amount: 8500 },
    ]);
    expect(summary.rating).toBe(4.8);
  });

  it("uses the first photo and leaves optional fields out", () => {
    const summary = toSummary(product(), parts);

    expect(summary.image).toEqual({
      src: "/a.jpg",
      alt: "A",
      position: "50% 0%",
    });
    expect(summary.isNew).toBeUndefined();
    expect(summary.badge).toBeUndefined();
    expect(summary.notes).toBeUndefined();
    expect(summary.rating).toBeUndefined();
  });

  it("only uses rows of its own product", () => {
    const summary = toSummary(product({ id: "other" }), parts);

    expect(summary.prices).toEqual([]);
    expect(summary.image).toBeUndefined();
    expect(summary.colors).toBeUndefined();
  });

  it("includes a badge only when it has both text and tone", () => {
    const badge = toSummary(
      product({ badge_label: "NEW ARRIVAL", badge_tone: "dark" }),
      parts,
    ).badge;

    expect(badge).toEqual({ label: "NEW ARRIVAL", tone: "dark" });
  });
});

describe("toListedProduct", () => {
  it("shows the main category as the filter value and keeps the names the search reads", () => {
    const listed = toListedProduct(
      product({
        category_slug: "men",
        category_label: "Men",
        subcategory_label: "CASUAL WEAR",
        subcategory_short_label: "Casual",
        collection_label: "Men Casual",
        collection_slug: "men-casual",
        availability: "in-stock",
      }),
      parts,
    );

    expect(listed.collection).toBe("men");
    expect(listed.categoryLabel).toBe("Men");
    expect(listed.subcategoryLabel).toBe("Casual");
    expect(listed.collectionLabel).toBe("Men Casual");
    expect(listed.availability).toBe("in-stock");
  });

  it("has no category fields for a product that belongs to none", () => {
    const listed = toListedProduct(product(), parts);

    expect(listed.collection).toBeUndefined();
    expect(listed.categoryLabel).toBeUndefined();
  });
});

describe("toListingFacets", () => {
  const category = (
    slug: string,
    sizes: string[],
    min: string,
    max: string,
    step: string,
  ): CategoryRow =>
    ({
      id: slug,
      slug,
      label: slug.toUpperCase(),
      filter_sizes: sizes,
      price_min: min,
      price_max: max,
      price_step: step,
    }) as CategoryRow;

  it("merges sizes and price bounds across categories", () => {
    const facets = toListingFacets([
      category("men", ["S", "M"], "50000", "400000", "5000"),
      category("bags", ["M", "One size"], "20000", "500000", "2500"),
    ]);

    expect(facets.collections).toEqual([
      { value: "men", label: "MEN" },
      { value: "bags", label: "BAGS" },
    ]);
    expect(facets.sizes).toEqual(["S", "M", "One size"]);
    expect(facets.priceRange).toEqual({ min: 20000, max: 500000, step: 2500 });
  });
});

describe("toProductDetail", () => {
  const stock = [
    { variant_id: "v1", market: "PK" as const, available: 3 },
    { variant_id: "v1", market: "DE" as const, available: 0 },
    { variant_id: "v2", market: "PK" as const, available: -2 },
  ];

  it("gives each variant its stock per market, never below zero", () => {
    const detail = toProductDetail(product(), parts, [], stock);

    expect(detail.variants.map((item) => [item.id, item.stock])).toEqual([
      ["v1", { PK: 3, DE: 0 }],
      ["v2", { PK: 0, DE: 0 }],
      ["v3", { PK: 0, DE: 0 }],
      ["v4", { PK: 0, DE: 0 }],
    ]);
    expect(detail.variants[0]).toMatchObject({ color: "Black", size: "S" });
  });

  it("returns every photo and the detail cards", () => {
    const detail = toProductDetail(
      product({ rating_avg: "5.0", rating_count: 23 }),
      parts,
      [{ product_id: "p1", title: "Material", body: "Cashmere" }],
      [],
    );

    expect(detail.images.map((image) => image.src)).toEqual([
      "/a.jpg",
      "/b.jpg",
    ]);
    expect(detail.details).toEqual([{ title: "Material", body: "Cashmere" }]);
    expect(detail.reviewCount).toBe(23);
  });

  it("marks a NEW ARRIVAL badged product as new on its page", () => {
    const badged = product({ badge_label: "NEW ARRIVAL", badge_tone: "light" });

    expect(toProductDetail(badged, parts, [], []).isNew).toBe(true);
    expect(toProductDetail(product(), parts, [], []).isNew).toBeUndefined();
  });
});

describe("isSlug", () => {
  it.each(["linen-shirt", "a", "shirt-2"])("accepts %s", (value) => {
    expect(isSlug(value)).toBe(true);
  });

  it.each(["", "Linen", "a--b", "-a", "a-", "a b", "a/b", "x".repeat(121)])(
    "rejects %j",
    (value) => {
      expect(isSlug(value)).toBe(false);
    },
  );
});
