import { describe, expect, it } from "vitest";

import { calculateTotals, vatInside, type PricingConfig } from "./order-totals";

const FREE: PricingConfig = {
  shippingFee: { PK: 0, DE: 0 },
  vatRateDePercent: 19,
};
const WITH_FEES: PricingConfig = {
  shippingFee: { PK: 30_000, DE: 590 },
  vatRateDePercent: 19,
};

describe("calculateTotals", () => {
  it("adds price times quantity, in whole minor units", () => {
    expect(
      calculateTotals(
        [
          { unitAmount: 89000, quantity: 2 },
          { unitAmount: 1250, quantity: 3 },
        ],
        "PK",
        FREE,
      ),
    ).toEqual({
      subtotal: 89000 * 2 + 1250 * 3,
      discountTotal: 0,
      shippingTotal: 0,
      taxTotal: 0,
      taxIncluded: null,
      total: 89000 * 2 + 1250 * 3,
    });
  });

  it("is zero for no lines, even when shipping has a fee", () => {
    expect(calculateTotals([], "PK", WITH_FEES)).toMatchObject({
      shippingTotal: 0,
      total: 0,
    });
    expect(calculateTotals([], "DE", WITH_FEES)).toMatchObject({
      shippingTotal: 0,
      taxTotal: 0,
      total: 0,
    });
  });

  it("never produces a fraction of a minor unit", () => {
    const { total } = calculateTotals(
      [{ unitAmount: 1999, quantity: 7 }],
      "PK",
      FREE,
    );
    expect(Number.isInteger(total)).toBe(true);
    expect(total).toBe(13993);
  });

  it("adds the flat shipping fee of the market to the total", () => {
    const line = [{ unitAmount: 100_000, quantity: 1 }];

    expect(calculateTotals(line, "PK", WITH_FEES)).toMatchObject({
      subtotal: 100_000,
      shippingTotal: 30_000,
      total: 130_000,
    });
    expect(calculateTotals(line, "DE", WITH_FEES)).toMatchObject({
      subtotal: 100_000,
      shippingTotal: 590,
      total: 100_590,
    });
  });

  it("charges no shipping when no fee is set", () => {
    expect(
      calculateTotals([{ unitAmount: 5_000, quantity: 1 }], "DE", FREE),
    ).toMatchObject({ shippingTotal: 0, total: 5_000 });
  });

  it("Germany: VAT is already inside the total, worked out on goods plus shipping, and never added", () => {
    const totals = calculateTotals(
      [{ unitAmount: 11_900, quantity: 1 }],
      "DE",
      FREE,
    );
    expect(totals).toMatchObject({
      taxIncluded: true,
      taxTotal: 1_900,
      total: 11_900,
    });

    const withShipping = calculateTotals(
      [{ unitAmount: 10_000, quantity: 1 }],
      "DE",
      { shippingFee: { PK: 0, DE: 1_900 }, vatRateDePercent: 19 },
    );
    // (10 000 + 1 900) x 19 / 119 = 1 900
    expect(withShipping).toMatchObject({
      taxIncluded: true,
      taxTotal: 1_900,
      total: 11_900,
    });
  });

  it("Pakistan: no tax is worked out", () => {
    expect(
      calculateTotals([{ unitAmount: 50_000, quantity: 2 }], "PK", WITH_FEES),
    ).toMatchObject({ taxIncluded: null, taxTotal: 0 });
  });

  it("follows the configured VAT rate", () => {
    const totals = calculateTotals(
      [{ unitAmount: 10_700, quantity: 1 }],
      "DE",
      { shippingFee: { PK: 0, DE: 0 }, vatRateDePercent: 7 },
    );
    expect(totals.taxTotal).toBe(700);
  });
});

describe("vatInside", () => {
  it("rounds to a whole minor unit", () => {
    // 1000 x 19 / 119 = 159.66...
    expect(vatInside(1_000, 19)).toBe(160);
    expect(Number.isInteger(vatInside(12_345, 19))).toBe(true);
  });

  it("is zero for a zero amount or a zero rate", () => {
    expect(vatInside(0, 19)).toBe(0);
    expect(vatInside(10_000, 0)).toBe(0);
  });
});
