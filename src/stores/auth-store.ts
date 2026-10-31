import { create } from "zustand";

import type { AuthUser } from "@/features/auth/auth-service";

interface AuthState {
  user: AuthUser | null;
  /** "loading" until the server has said who is signed in (GET /auth/me); then "ready". */
  status: "loading" | "ready";
  setUser: (user: AuthUser) => void;
  clear: () => void;
  /** Called with the server's answer when the site loads. */
  hydrate: (user: AuthUser | null) => void;
}

/*
 * Who is signed in, for the UI. The session itself is an httpOnly cookie the
 * browser cannot read, so this store only mirrors what the API says. It is
 * deliberately not saved to localStorage: a copy there could go stale (signed
 * out elsewhere, password changed) and would keep personal details on the device.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: "loading",
  setUser: (user) => set({ user, status: "ready" }),
  clear: () => set({ user: null, status: "ready" }),
  hydrate: (user) => set({ user, status: "ready" }),
}));

/** True once the server has answered, so pages know "not signed in" is real and not just "not loaded yet". */
export function useAuthReady() {
  return useAuthStore((state) => state.status === "ready");
}
