import { describe, expect, it } from "vitest";

import type { CartLine } from "@/features/cart/cart-service";
import type { Pricing } from "@/features/cart/pricing-service";

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

describe("getCartTotals with discounts", () => {
  it("shows the subtotal at list price, the discount, and a total that is less by that much", () => {
    const totals = getCartTotals(
      [
        // 2 x 1,000.00 with 20% off, ticked.
        line({
          unitPrice: {
            amount: 80000,
            currency: "PKR",
            compareAtAmount: 100000,
            listAmount: 100000,
            discountPercent: 20,
          },
          quantity: 2,
        }),
        // 1 x 500.00, no discount, ticked.
        line({
          variantId: "v2",
          unitPrice: { amount: 50000, currency: "PKR" },
          quantity: 1,
        }),
        // A discounted line that is not ticked never counts.
        line({
          variantId: "v3",
          selected: false,
          unitPrice: {
            amount: 8000,
            currency: "PKR",
            listAmount: 10000,
            discountPercent: 20,
          },
        }),
      ],
      {
        shippingFee: 30000,
        taxIncluded: false,
        vatRatePercent: null,
      } as Pricing,
    );

    expect(totals.subtotal).toBe(250000);
    expect(totals.discount).toBe(40000);
    expect(totals.total).toBe(250000 - 40000 + 30000);
  });

  it("has no discount when no line is discounted", () => {
    const totals = getCartTotals([line()]);
    expect(totals.discount).toBe(0);
    expect(totals.total).toBe(totals.subtotal);
  });
});

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

describe("getCartTotals with shipping and VAT", () => {
  const pk: Pricing = {
    market: "PK",
    shippingFee: 30_000,
    taxIncluded: null,
    vatRatePercent: null,
  };
  const de: Pricing = {
    market: "DE",
    shippingFee: 1_900,
    taxIncluded: true,
    vatRatePercent: 19,
  };

  it("adds the flat shipping fee once, not per item", () => {
    const totals = getCartTotals(
      [line({ quantity: 3, unitPrice: { amount: 10_000, currency: "PKR" } })],
      pk,
    );

    expect(totals).toMatchObject({
      subtotal: 30_000,
      shipping: 30_000,
      total: 60_000,
      vatIncluded: null,
      pricingReady: true,
    });
  });

  it("charges no shipping when nothing is selected", () => {
    const totals = getCartTotals([line({ selected: false })], pk);

    expect(totals).toMatchObject({ shipping: 0, total: 0, selectedCount: 0 });
  });

  it("shows the VAT that is already inside a German total without adding it", () => {
    const totals = getCartTotals(
      [line({ quantity: 1, unitPrice: { amount: 10_000, currency: "EUR" } })],
      de,
    );

    // (10 000 + 1 900) x 19 / 119 = 1 900, and the total stays 11 900.
    expect(totals.total).toBe(11_900);
    expect(totals.tax).toBe(0);
    expect(totals.vatIncluded).toEqual({ ratePercent: 19, amount: 1_900 });
  });

  it("is not ready, and adds nothing, until the pricing has loaded", () => {
    const totals = getCartTotals([line()]);

    expect(totals).toMatchObject({
      shipping: 0,
      vatIncluded: null,
      pricingReady: false,
    });
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
