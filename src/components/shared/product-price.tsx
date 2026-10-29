"use client";

import { useUiStore } from "@/stores/ui-store";
import type { RegionalPrice } from "@/types/region";
import { formatRegionalPrice } from "@/utils/format-currency";

interface ProductPriceProps {
  prices: RegionalPrice[];
  className?: string;
}

/** Shows the price for the selected region. Amounts come from the backend, never converted here. */
export function ProductPrice({ prices, className }: ProductPriceProps) {
  const region = useUiStore((state) => state.region);
  const price = prices.find((item) => item.region === region);

  if (!price) return null;

  return (
    <span className={className}>
      {formatRegionalPrice(price.amount, region)}
    </span>
  );
}
