import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_REGION, REGIONS } from "@/config/regions";
import type { RegionCode } from "@/types/region";
import { cookieStorage } from "@/utils/cookie-storage";

interface UiState {
  region: RegionCode;
  isMobileNavOpen: boolean;
  isCartOpen: boolean;
  setRegion: (region: RegionCode) => void;
  setMobileNavOpen: (open: boolean) => void;
  setCartOpen: (open: boolean) => void;
}

function isRegionCode(value: unknown): value is RegionCode {
  return typeof value === "string" && Object.hasOwn(REGIONS, value);
}

/**
 * Client-only UI state. Server data belongs in TanStack Query.
 *
 * Only the chosen region is remembered (in a first-party cookie for a year),
 * so a reload or a later visit keeps the shopper's country and currency.
 * It is restored after the page has loaded (see RegionSync) and not while it
 * is being created, because the server HTML is always built for the default
 * region and the first browser render must match it.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      region: DEFAULT_REGION,
      isMobileNavOpen: false,
      isCartOpen: false,
      setRegion: (region) => set({ region }),
      setMobileNavOpen: (isMobileNavOpen) => set({ isMobileNavOpen }),
      setCartOpen: (isCartOpen) => set({ isCartOpen }),
    }),
    {
      name: "luzanika-region",
      version: 1,
      storage: createJSONStorage(() => cookieStorage),
      skipHydration: true,
      partialize: ({ region }) => ({ region }),
      // A cookie can be edited by hand; anything that is not a known region is ignored.
      merge: (saved, current) => ({
        ...current,
        region: isRegionCode((saved as { region?: unknown } | null)?.region)
          ? (saved as { region: RegionCode }).region
          : current.region,
      }),
    },
  ),
);
