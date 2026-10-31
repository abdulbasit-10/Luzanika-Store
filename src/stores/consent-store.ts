import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { cookieStorage } from "@/utils/cookie-storage";

/** What the visitor allowed. Essential cookies are always on, so they are not stored. */
export interface CookieConsent {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export const NO_OPTIONAL_COOKIES: CookieConsent = {
  functional: false,
  analytics: false,
  marketing: false,
};

export const ALL_COOKIES: CookieConsent = {
  functional: true,
  analytics: true,
  marketing: true,
};

interface ConsentState {
  /** Null until the visitor has chosen; the consent banner shows while it is null. */
  consent: CookieConsent | null;
  setConsent: (consent: CookieConsent) => void;
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      consent: null,
      setConsent: (consent) => set({ consent }),
    }),
    {
      name: "luzanika-consent",
      version: 1,
      storage: createJSONStorage(() => cookieStorage),
      partialize: ({ consent }) => ({ consent }),
    },
  ),
);
