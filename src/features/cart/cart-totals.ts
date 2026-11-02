import type { CartLine } from "@/stores/cart-store";
import type { RegionCode } from "@/types/region";

export interface CartTotals {
  /** Sum of the selected lines (unit price x quantity). */
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  selectedCount: number;
}

export function getUnitPrice(line: CartLine, region: RegionCode) {
  return line.prices.find((price) => price.region === region)?.amount;
}

/**
 * Totals of the selected lines. Discounts and tax are 0 until the backend
 * sends them; the total is always subtotal - discount + tax.
 */
export function getCartTotals(
  lines: CartLine[],
  region: RegionCode,
): CartTotals {
  const selected = lines.filter((line) => line.selected);
  const subtotal = selected.reduce(
    (sum, line) => sum + (getUnitPrice(line, region) ?? 0) * line.quantity,
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

/** Number of items in the whole cart (all quantities, selected or not). */
export function getItemCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
