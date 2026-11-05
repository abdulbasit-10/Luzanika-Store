import { describe, expect, it } from "vitest";

import {
  categoryBody,
  categoryProblems,
  moveItem,
  nameSlugProblems,
  sizesFromText,
  slugFromLabel,
  type CategoryText,
} from "./catalog-forms";

const ok: CategoryText = {
  label: "Shoes",
  slug: "shoes",
  heroTitle: "Shoes",
  title: "All shoes",
  description: "Our shoes.",
  heroImageSrc: "/images/categories/shoes.jpg",
  heroImageAlt: "",
  heroImagePosition: "",
  allLabel: "ALL SHOES",
  filterSizes: "38, 39, 40",
  priceMin: "500",
  priceMax: "5000",
  priceStep: "50",
};

describe("slugFromLabel", () => {
  it("makes a web address from a name", () => {
    expect(slugFromLabel("Men Casual & Co")).toBe("men-casual-co");
    expect(slugFromLabel("  Café  ")).toBe("cafe");
    expect(slugFromLabel("!!!")).toBe("");
  });
});

describe("nameSlugProblems", () => {
  it("needs a name and a clean slug", () => {
    expect(nameSlugProblems({ label: "", slug: "" })).toEqual({
      label: "Enter a name",
      slug: "Enter a web address",
    });
    expect(
      nameSlugProblems({ label: "A", slug: "Bad Slug" }).slug,
    ).toBeTruthy();
    expect(nameSlugProblems({ label: "A", slug: "a-b" })).toEqual({});
  });
});

describe("sizesFromText", () => {
  it("splits on commas and lines", () => {
    expect(sizesFromText("S, M\nL,, ")).toEqual(["S", "M", "L"]);
  });
});

describe("categoryProblems", () => {
  it("accepts a complete category", () => {
    expect(categoryProblems(ok)).toEqual({});
  });

  it("only allows pictures from this site", () => {
    expect(
      categoryProblems({ ...ok, heroImageSrc: "https://x.com/a.jpg" })
        .heroImageSrc,
    ).toBeTruthy();
    expect(
      categoryProblems({ ...ok, heroImageSrc: "/images/../a.jpg" })
        .heroImageSrc,
    ).toBeTruthy();
  });

  it("checks the slider and the sizes", () => {
    expect(categoryProblems({ ...ok, priceMax: "400" }).priceMax).toMatch(
      /above/,
    );
    expect(categoryProblems({ ...ok, priceStep: "0" }).priceStep).toBeTruthy();
    expect(
      categoryProblems({ ...ok, filterSizes: "S, S" }).filterSizes,
    ).toMatch(/once/);
  });

  it("checks the picture position", () => {
    expect(categoryProblems({ ...ok, heroImagePosition: "50% 25%" })).toEqual(
      {},
    );
    expect(
      categoryProblems({ ...ok, heroImagePosition: "somewhere" })
        .heroImagePosition,
    ).toBeTruthy();
  });
});

describe("categoryBody", () => {
  it("sends the slider in minor units and an empty position as null", () => {
    const body = categoryBody(ok);
    expect(body.priceMin).toBe(50000);
    expect(body.priceMax).toBe(500000);
    expect(body.priceStep).toBe(5000);
    expect(body.heroImagePosition).toBeNull();
    expect(body.filterSizes).toEqual(["38", "39", "40"]);
  });
});

describe("moveItem", () => {
  it("moves an item and ignores moves off the ends", () => {
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 2, 3)).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });
});
