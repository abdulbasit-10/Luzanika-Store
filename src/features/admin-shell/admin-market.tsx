"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { RegionCode } from "@/types/region";

/** "all" shows both markets; screens pass anything else to the API as `market`. */
export type AdminMarket = "all" | RegionCode;

interface MarketState {
  market: AdminMarket;
  setMarket: (market: AdminMarket) => void;
  /** The `market` query value for the admin API, or undefined for both markets. */
  marketParam: RegionCode | undefined;
}

const MarketContext = createContext<MarketState | null>(null);

/** The market picked in the header, shared by every admin screen. */
export function AdminMarketProvider({ children }: { children: ReactNode }) {
  const [market, setMarket] = useState<AdminMarket>("all");
  const value = useMemo<MarketState>(
    () => ({
      market,
      setMarket,
      marketParam: market === "all" ? undefined : market,
    }),
    [market],
  );
  return <MarketContext value={value}>{children}</MarketContext>;
}

export function useAdminMarket(): MarketState {
  const state = useContext(MarketContext);
  if (!state) {
    throw new Error("useAdminMarket must be used inside the admin layout");
  }
  return state;
}
