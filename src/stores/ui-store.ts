import { create } from "zustand";

import { DEFAULT_REGION } from "@/config/regions";
import type { RegionCode } from "@/types/region";

interface UiState {
  region: RegionCode;
  isMobileNavOpen: boolean;
  isCartOpen: boolean;
  setRegion: (region: RegionCode) => void;
  setMobileNavOpen: (open: boolean) => void;
  setCartOpen: (open: boolean) => void;
}

/** Client-only UI state. Server data belongs in TanStack Query. */
export const useUiStore = create<UiState>((set) => ({
  region: DEFAULT_REGION,
  isMobileNavOpen: false,
  isCartOpen: false,
  setRegion: (region) => set({ region }),
  setMobileNavOpen: (isMobileNavOpen) => set({ isMobileNavOpen }),
  setCartOpen: (isCartOpen) => set({ isCartOpen }),
}));
