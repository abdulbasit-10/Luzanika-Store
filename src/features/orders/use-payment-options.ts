"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchPaymentOptions } from "@/features/orders/order-service";
import type { RegionCode } from "@/types/region";

/** Cache key prefix for the payment methods of a market. */
export const PAYMENT_OPTIONS_KEY = "payment-options";

/**
 * How a shopper of the market can pay, and where to send a transfer. The same
 * for every visitor, so it needs no sign-in. Kept only briefly, so a changed
 * bank account shows up quickly.
 */
export function usePaymentOptions(region: RegionCode) {
  const query = useQuery({
    queryKey: [PAYMENT_OPTIONS_KEY, region],
    queryFn: () => fetchPaymentOptions(region),
    staleTime: 30_000,
    retry: 1,
  });

  return {
    options: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
