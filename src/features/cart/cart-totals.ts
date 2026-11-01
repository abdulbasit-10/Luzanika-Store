import { isBuyable, type CartLine } from "@/features/cart/cart-service";

export interface CartTotals {
  /** Sum of the selected lines (unit price x quantity). */
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  selectedCount: number;
}

/** The unit price in minor units. The cart is read for the selected region, so this is already that region's price. */
export function getUnitPrice(line: CartLine) {
  return line.unitPrice?.amount;
}

/**
 * Totals of the selected lines. Discounts and tax are 0 until the backend
 * sends them; the total is always subtotal - discount + tax.
 */
export function getCartTotals(lines: CartLine[]): CartTotals {
  // A line that cannot be bought (sold out, no longer sold) never counts, even if it was ticked.
  const selected = lines.filter((line) => line.selected && isBuyable(line));
  const subtotal = selected.reduce(
    (sum, line) => sum + (getUnitPrice(line) ?? 0) * line.quantity,
    0,
  );
  const discount = 0;
  const tax = 0;

  return {
    subtotal,
    discount,
    tax,
    total: subtotal - discount + tax,
    selectedCount: selected.length,
  };
}

/** Number of items in the whole cart that can be bought (all quantities, selected or not). */
export function getItemCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
