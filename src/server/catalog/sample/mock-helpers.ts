import type { ProductColor } from "@/types/product";
import type { RegionalPrice } from "@/types/region";

/**
 * Helpers for the temporary catalog data. They go away together with the mock
 * files once the backend provides real regional prices and colors.
 */
/** `amount` is in major units (850 = 850.00); stored as minor units. */
export function mockPrices(amount: number): RegionalPrice[] {
  const minor = Math.round(amount * 100);
  return [
    { region: "PK", currency: "PKR", amount: minor },
    { region: "DE", currency: "EUR", amount: minor },
  ];
}

export const mockColors: ProductColor[] = [
  { name: "Black", hex: "#252525" },
  { name: "Forest", hex: "#1f6b50" },
  { name: "Cream", hex: "#f4f1ea" },
];
