import { describe, expect, it } from "vitest";

import type { CartLine } from "@/features/cart/cart-service";

import { getCartTotals, getItemCount } from "./cart-totals";

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    variantId: "v1",
    productId: "p1",
    slug: "shirt",
    name: "Shirt",
    unitPrice: { amount: 85000, currency: "PKR" },
    quantity: 2,
    requestedQuantity: 2,
    available: 10,
    selected: true,
    status: "ok",
    ...overrides,
  };
}

describe("getCartTotals", () => {
  it("adds up price times quantity of the ticked lines, in minor units", () => {
    const totals = getCartTotals([
      line(),
      line({
        variantId: "v2",
        unitPrice: { amount: 1250, currency: "PKR" },
        quantity: 3,
      }),
      line({ variantId: "v3", selected: false }),
    ]);

    expect(totals).toMatchObject({
      subtotal: 85000 * 2 + 1250 * 3,
      total: 85000 * 2 + 1250 * 3,
      selectedCount: 2,
    });
  });

  it("counts the lowered quantity of an adjusted line", () => {
    const totals = getCartTotals([
      line({ status: "adjusted", quantity: 3, requestedQuantity: 5 }),
    ]);

    expect(totals.subtotal).toBe(85000 * 3);
  });

  it("never counts a line that cannot be bought, even when ticked", () => {
    const totals = getCartTotals([
      line({ status: "out_of_stock", quantity: 0 }),
      line({ variantId: "v2", status: "unavailable", quantity: 0 }),
    ]);

    expect(totals).toMatchObject({ subtotal: 0, total: 0, selectedCount: 0 });
  });

  it("is zero for an empty cart", () => {
    expect(getCartTotals([])).toMatchObject({ subtotal: 0, selectedCount: 0 });
  });
});

describe("getItemCount", () => {
  it("adds the quantities that can be bought", () => {
    expect(
      getItemCount([
        line(),
        line({ variantId: "v2", quantity: 0, status: "out_of_stock" }),
        line({ variantId: "v3", quantity: 4 }),
      ]),
    ).toBe(6);
  });
});
