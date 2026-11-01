import { describe, expect, it } from "vitest";

import type { CartLineRow } from "@/server/repositories/cart-repository";

import { toCartLine } from "./cart-lines";

function row(overrides: Partial<CartLineRow> = {}): CartLineRow {
  return {
    variant_id: "v1",
    quantity: 2,
    selected: true,
    product_id: "p1",
    slug: "linen-shirt",
    name: "Linen Shirt",
    notes: [],
    color_name: "Black",
    size_label: "M",
    color_count: 3,
    purchasable: true,
    currency: "PKR",
    amount: "85000",
    compare_at_amount: null,
    available: 10,
    image_src: "/a.jpg",
    image_alt: "A shirt",
    image_position: "50% 0%",
    ...overrides,
  };
}

describe("toCartLine", () => {
  it("is ok when the stock covers what was asked for", () => {
    expect(toCartLine(row())).toMatchObject({
      status: "ok",
      quantity: 2,
      requestedQuantity: 2,
      available: 10,
      selected: true,
      unitPrice: { amount: 85000, currency: "PKR" },
      color: "Black",
      size: "M",
      image: { src: "/a.jpg", alt: "A shirt", position: "50% 0%" },
    });
  });

  it("allows exactly the available amount", () => {
    expect(toCartLine(row({ quantity: 10 })).status).toBe("ok");
  });

  it("lowers the quantity to the stock and remembers what was asked for", () => {
    expect(toCartLine(row({ quantity: 12 }))).toMatchObject({
      status: "adjusted",
      quantity: 10,
      requestedQuantity: 12,
      selected: true,
    });
  });

  it("is out of stock at zero, and never selected", () => {
    expect(toCartLine(row({ available: 0 }))).toMatchObject({
      status: "out_of_stock",
      quantity: 0,
      requestedQuantity: 2,
      selected: false,
    });
  });

  it("treats a negative stock number as zero", () => {
    expect(toCartLine(row({ available: -3 })).status).toBe("out_of_stock");
  });

  it("is unavailable when it cannot be sold, whatever the stock says", () => {
    expect(
      toCartLine(row({ purchasable: false, available: 50 })),
    ).toMatchObject({
      status: "unavailable",
      quantity: 0,
      available: 0,
      selected: false,
    });
  });

  it("has no price when the market has none", () => {
    expect(
      toCartLine(row({ purchasable: false, amount: null, currency: null }))
        .unitPrice,
    ).toBeNull();
  });

  it("keeps a was-price when there is one", () => {
    expect(toCartLine(row({ compare_at_amount: "99000" })).unitPrice).toEqual({
      amount: 85000,
      currency: "PKR",
      compareAtAmount: 99000,
    });
  });

  it("shows the colour only when the product comes in more than one", () => {
    expect(toCartLine(row({ color_count: 1 })).color).toBeUndefined();
    expect(toCartLine(row({ color_name: null })).color).toBeUndefined();
  });

  it("leaves out what a product does not have", () => {
    const line = toCartLine(
      row({
        size_label: null,
        image_src: null,
        image_alt: null,
        image_position: null,
      }),
    );
    expect(line.size).toBeUndefined();
    expect(line.image).toBeUndefined();
    expect(line.notes).toBeUndefined();
  });

  it("keeps an unticked line unticked", () => {
    expect(toCartLine(row({ selected: false })).selected).toBe(false);
  });
});
