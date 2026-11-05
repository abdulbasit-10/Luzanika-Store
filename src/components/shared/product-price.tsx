"use client";

import { useUiStore } from "@/stores/ui-store";
import type { RegionalPrice } from "@/types/region";
import { formatRegionalPrice } from "@/utils/format-currency";

interface ProductPriceProps {
  prices: RegionalPrice[];
  className?: string;
}

/** The "-20%" label shown beside a discounted price. */
export function DiscountBadge({ percent }: { percent: number }) {
  return (
    <span className="inline-flex items-center rounded-md bg-danger px-1.5 py-0.5 align-middle text-[0.7rem] leading-none font-semibold whitespace-nowrap text-white">
      <span className="sr-only">{percent} percent off</span>
      <span aria-hidden>−{percent}%</span>
    </span>
  );
}

/**
 * Shows the price for the selected region, with the old price struck through
 * when the product has one, and a "-20%" label while a discount applies. Amounts
 * come from the backend, never converted here.
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
      {price.discountPercent !== undefined ? (
        <>
          {" "}
          <DiscountBadge percent={price.discountPercent} />
        </>
      ) : null}
    </span>
  );
}
