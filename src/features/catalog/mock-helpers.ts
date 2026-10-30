import type { ProductColor } from "@/types/product";
import type { RegionalPrice } from "@/types/region";

/**
 * Helpers for the temporary catalog data. They go away together with the mock
 * files once the backend provides real regional prices and colors.
 */
export function mockPrices(amount: number): RegionalPrice[] {
  return [
    { region: "PK", currency: "PKR", amount },
    { region: "DE", currency: "EUR", amount },
  ];
}

export const mockColors: ProductColor[] = [
  { name: "Black", hex: "#252525" },
  { name: "Forest", hex: "#1f6b50" },
  { name: "Cream", hex: "#f4f1ea" },
];
