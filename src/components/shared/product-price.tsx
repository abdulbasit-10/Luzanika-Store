"use client";

import { useUiStore } from "@/stores/ui-store";
import type { RegionalPrice } from "@/types/region";
import { formatRegionalPrice } from "@/utils/format-currency";

interface ProductPriceProps {
  prices: RegionalPrice[];
  className?: string;
}

/**
 * Shows the price for the selected region, with the old price struck through
 * when the product has one. Amounts come from the backend, never converted here.
 */
export function ProductPrice({ prices, className }: ProductPriceProps) {
  const region = useUiStore((state) => state.region);
  const price = prices.find((item) => item.region === region);

  if (!price) return null;

  const wasPrice =
    price.compareAtAmount !== undefined && price.compareAtAmount > price.amount
      ? price.compareAtAmount
      : null;

  return (
    <span className={className}>
      {formatRegionalPrice(price.amount, region)}
      {wasPrice !== null ? (
        <>
          {" "}
          <s className="text-[0.75em] font-normal text-muted-foreground">
            <span className="sr-only">Was </span>
            {formatRegionalPrice(wasPrice, region)}
          </s>
        </>
      ) : null}
    </span>
  );
}
