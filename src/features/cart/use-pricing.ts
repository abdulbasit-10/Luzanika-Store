"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchPricing } from "@/features/cart/pricing-service";
import type { RegionCode } from "@/types/region";

/** Cache key prefix for the shipping and tax rules. */
export const PRICING_KEY = "pricing";

/**
 * The shipping fee and tax rule of the selected market. The same for every
 * visitor, so it needs no sign-in. The cart and checkout wait for it before
 * showing or sending a total, so the shopper sees what the server charges.
 */
export function usePricing(region: RegionCode) {
  const query = useQuery({
    queryKey: [PRICING_KEY, region],
    queryFn: () => fetchPricing(region),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return {
    pricing: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
