import { describe, expect, it } from "vitest";

import {
  EMPTY_DISCOUNT,
  describeDates,
  discountProblems,
  fromLocalInput,
  productLabel,
  toDiscountInput,
  toLocalInput,
  type DiscountFormValues,
} from "./discount-forms";

const ok: DiscountFormValues = {
  ...EMPTY_DISCOUNT,
  name: "Winter sale",
  percent: "20",
  products: [{ id: "p1", name: "Dress", slug: "dress", category: "Ladies" }],
};

describe("discountProblems", () => {
  it("accepts a complete discount, with or without dates", () => {
    expect(discountProblems(ok)).toEqual({});
    expect(
      discountProblems({
        ...ok,
        startsAt: "2026-11-20T09:00",
        endsAt: "2026-12-31T23:00",
      }),
    ).toEqual({});
  });

  it("needs a name, a whole percent from 1 to 90, a market and a product", () => {
    expect(discountProblems(EMPTY_DISCOUNT)).toEqual({
      name: "Please give the discount a name",
      percent: "Enter a whole percent from 1 to 90",
      products: "Choose at least one product",
    });
    for (const percent of ["0", "91", "12.5", "ten", ""]) {
      expect(
        discountProblems({ ...ok, percent }).percent,
        percent,
      ).toBeDefined();
    }
    for (const percent of ["1", "20", "90"]) {
      expect(
        discountProblems({ ...ok, percent }).percent,
        percent,
      ).toBeUndefined();
    }
    expect(discountProblems({ ...ok, markets: [] }).markets).toBeDefined();
  });

  it("refuses an end that is not after the start", () => {
    expect(
      discountProblems({
        ...ok,
        startsAt: "2026-11-20T09:00",
        endsAt: "2026-11-20T09:00",
      }).endsAt,
    ).toBe("The end must be after the start");
    expect(
      discountProblems({ ...ok, startsAt: "", endsAt: "2026-11-20T09:00" })
        .endsAt,
    ).toBeUndefined();
  });
});

describe("productLabel", () => {
  it("adds the category so two products with one name can be told apart", () => {
    expect(productLabel({ name: "Overshirt", category: "Kids" })).toBe(
      "Overshirt · Kids",
    );
    expect(productLabel({ name: "Overshirt", category: "Men" })).toBe(
      "Overshirt · Men",
    );
    expect(productLabel({ name: "Overshirt", category: null })).toBe(
      "Overshirt",
    );
  });
});

describe("dates", () => {
  it("round-trips a moment through a date box", () => {
    const iso = "2026-11-20T09:30:00.000Z";
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
    expect(toLocalInput(null)).toBe("");
    expect(fromLocalInput("  ")).toBeNull();
    expect(fromLocalInput("not a date")).toBeNull();
  });

  it("describes the dates in plain words", () => {
    expect(describeDates(null, null)).toBe("Always");
    expect(describeDates("2026-11-20T09:00:00Z", null)).toBe(
      "From 20 Nov 2026",
    );
    expect(describeDates(null, "2026-12-31T09:00:00Z")).toBe(
      "Until 31 Dec 2026",
    );
    expect(describeDates("2026-11-20T09:00:00Z", "2026-12-31T09:00:00Z")).toBe(
      "20 Nov 2026 – 31 Dec 2026",
    );
  });
});

describe("toDiscountInput", () => {
  it("builds what the API takes", () => {
    expect(toDiscountInput({ ...ok, name: "  Winter sale " })).toEqual({
      name: "Winter sale",
      percent: 20,
      markets: ["PK", "DE"],
      startsAt: null,
      endsAt: null,
      active: true,
      productIds: ["p1"],
    });
  });
});
