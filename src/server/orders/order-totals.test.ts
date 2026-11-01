import { describe, expect, it } from "vitest";

import { calculateTotals } from "./order-totals";

describe("calculateTotals", () => {
  it("adds price times quantity, in whole minor units", () => {
    expect(
      calculateTotals([
        { unitAmount: 89000, quantity: 2 },
        { unitAmount: 1250, quantity: 3 },
      ]),
    ).toEqual({
      subtotal: 89000 * 2 + 1250 * 3,
      discountTotal: 0,
      shippingTotal: 0,
      taxTotal: 0,
      total: 89000 * 2 + 1250 * 3,
    });
  });

  it("is zero for no lines", () => {
    expect(calculateTotals([]).total).toBe(0);
  });

  it("never produces a fraction of a minor unit", () => {
    const { total } = calculateTotals([{ unitAmount: 1999, quantity: 7 }]);
    expect(Number.isInteger(total)).toBe(true);
    expect(total).toBe(13993);
  });
});
