export interface PricedLine {
  /** Minor units. */
  unitAmount: number;
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
}

/**
 * The one place an order's amounts are worked out. Shipping, tax and discounts
 * are all zero until the client decides them; when they do, they are added
 * here and nowhere else. Everything is whole minor units, so there is never a
 * rounding surprise.
 */
export function calculateTotals(lines: PricedLine[]): OrderTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitAmount * line.quantity,
    0,
  );
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;

  return {
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal,
    total: subtotal - discountTotal + shippingTotal,
  };
}
