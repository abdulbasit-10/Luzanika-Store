import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AuthUser } from "@/features/auth/auth-service";

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

/*
 * Who is signed in, for the UI. With the real backend the session is an
 * httpOnly cookie the browser cannot read; this store then only mirrors the
 * user returned by the API (e.g. GET /auth/me).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clear: () => set({ user: null }),
    }),
    {
      name: "luzanika-session",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ user }) => ({ user }),
    },
  ),
);
