"use client";

import type { ReactNode } from "react";

import { Countdown } from "@/components/shared/countdown";
import { useNow } from "@/hooks/use-now";
import { useUiStore } from "@/stores/ui-store";
import type { RegionalPrice } from "@/types/region";

/** The biggest saving, in whole percent, among prices that carry an old price. Null when none do. */
export function biggestDiscountPercent(prices: RegionalPrice[]): number | null {
  let best = 0;
  for (const price of prices) {
    if (price.compareAtAmount && price.compareAtAmount > price.amount) {
      best = Math.max(
        best,
        Math.round(
          ((price.compareAtAmount - price.amount) / price.compareAtAmount) *
            100,
        ),
      );
    }
  }
  return best > 0 ? best : null;
}

/** Hides the offers row the moment its end time has passed, without a reload. */
export function OfferExpiry({
  endsAt,
  children,
}: {
  /** Epoch ms, or null for an offer without an end. */
  endsAt: number | null;
  children: ReactNode;
}) {
  const now = useNow();
  if (endsAt !== null && now !== null && now >= endsAt) return null;
  return children;
}

/** The headline, and "Up to 40% off" worked out from the real old and new prices of the products shown. */
export function OfferTitle({
  headline,
  productPrices,
}: {
  headline: string | null;
  productPrices: RegionalPrice[][];
}) {
  const region = useUiStore((state) => state.region);
  const percent = biggestDiscountPercent(
    productPrices.flat().filter((price) => price.region === region),
  );
  return (
    <>
      {headline ?? "Special Offers"}
      {percent !== null ? (
        <span className="text-accent"> - up to {percent}% off</span>
      ) : null}
    </>
  );
}

export function OfferTimer({ endsAt }: { endsAt: number }) {
  return <Countdown endsAt={endsAt} />;
}
