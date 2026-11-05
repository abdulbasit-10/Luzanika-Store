/** The shipping and tax settings the amounts are worked out with (they come from the shop settings in the database). */
export interface PricingConfig {
  /** Flat fee per order and market, in minor units. 0 means free. */
  shippingFee: { PK: number; DE: number };
  /** Percent of VAT that is already inside German prices. */
  vatRateDePercent: number;
}

export interface PricedLine {
  /** The list price of one unit, before any discount. Minor units. */
  unitAmount: number;
  /** What one unit is discounted by (0 when it is not). Minor units. */
  discountPerUnit?: number;
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  /** For an order with `taxIncluded`, the part of `total` that is tax. Otherwise the tax added on top. */
  taxTotal: number;
  /** null: no tax is worked out for this market. true: the tax is already inside the prices. */
  taxIncluded: boolean | null;
  total: number;
}

/**
 * The VAT that is already inside a gross amount: gross x rate / (100 + rate),
 * rounded to a whole minor unit.
 */
export function vatInside(gross: number, ratePercent: number): number {
  return Math.round((gross * ratePercent) / (100 + ratePercent));
}

/**
 * The one place an order's amounts are worked out (the website shows the same
 * numbers, see cart-totals). Everything is whole minor units, so there is
 * never a rounding surprise.
 *
 * - Shipping: a flat fee per market, only for an order that has goods.
 * - Discounts: the subtotal is the list price; the discount of every unit is taken off
 *   it, so total = subtotal - discount + shipping.
 * - Tax: Germany's prices already include VAT, so it is worked out from the
 *   total and shown, but never added. Pakistan has no tax.
 */
export function calculateTotals(
  lines: PricedLine[],
  market: "PK" | "DE",
  config: PricingConfig,
): OrderTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitAmount * line.quantity,
    0,
  );
  const discountTotal = lines.reduce(
    (sum, line) => sum + (line.discountPerUnit ?? 0) * line.quantity,
    0,
  );
  const shippingTotal = lines.length > 0 ? config.shippingFee[market] : 0;
  const total = subtotal - discountTotal + shippingTotal;

  if (market === "DE") {
    return {
      subtotal,
      discountTotal,
      shippingTotal,
      // VAT base: goods + shipping. If the accountant says shipping is not
      // taxed, change only this line.
      taxTotal: vatInside(total, config.vatRateDePercent),
      taxIncluded: true,
      total,
    };
  }

  return {
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal: 0,
    taxIncluded: null,
    total,
  };
}
