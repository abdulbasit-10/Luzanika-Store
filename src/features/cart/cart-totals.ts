import { isBuyable, type CartLine } from "@/features/cart/cart-service";
import type { Pricing } from "@/features/cart/pricing-service";

export interface CartTotals {
  /** Sum of the selected lines (unit price x quantity). */
  subtotal: number;
  discount: number;
  /** Flat shipping fee of the market; 0 when nothing is selected or the fee is not set. */
  shipping: number;
  /** Tax added on top of the prices. None is added today (German VAT is already inside). */
  tax: number;
  /** VAT that is already inside the total (Germany), to show under it. Null where none is worked out. */
  vatIncluded: { ratePercent: number; amount: number } | null;
  total: number;
  selectedCount: number;
  /** False until the shipping and tax rule of the market has loaded; a total must not be sent before then. */
  pricingReady: boolean;
}

/** The unit price in minor units. The cart is read for the selected region, so this is already that region's price. */
export function getUnitPrice(line: CartLine) {
  return line.unitPrice?.amount;
}

/**
 * The VAT already inside a gross amount, rounded to a whole minor unit.
 * Same formula as the server (server/orders/order-totals), so the numbers match.
 */
function vatInside(gross: number, ratePercent: number) {
  return Math.round((gross * ratePercent) / (100 + ratePercent));
}

/**
 * Totals of the selected lines, the way the server will work them out:
 * total = subtotal - discount + shipping (+ tax added on top, which is none today).
 * Discounts are 0 until they are built.
 */
export function getCartTotals(
  lines: CartLine[],
  pricing?: Pricing,
): CartTotals {
  // A line that cannot be bought (sold out, no longer sold) never counts, even if it was ticked.
  const selected = lines.filter((line) => line.selected && isBuyable(line));
  const subtotal = selected.reduce(
    (sum, line) => sum + (getUnitPrice(line) ?? 0) * line.quantity,
    0,
  );
  const discount = 0;
  const shipping = selected.length > 0 ? (pricing?.shippingFee ?? 0) : 0;
  const tax = 0;
  const total = subtotal - discount + shipping + tax;

  return {
    subtotal,
    discount,
    shipping,
    tax,
    vatIncluded:
      pricing?.taxIncluded && pricing.vatRatePercent !== null
        ? {
            ratePercent: pricing.vatRatePercent,
            amount: vatInside(total, pricing.vatRatePercent),
          }
        : null,
    total,
    selectedCount: selected.length,
    pricingReady: pricing !== undefined,
  };
}

/** Number of items in the whole cart that can be bought (all quantities, selected or not). */
export function getItemCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
