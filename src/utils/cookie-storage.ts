import type { StateStorage } from "zustand/middleware";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Zustand storage that keeps its value in a first-party cookie, so the server
 * can read it later (e.g. to skip analytics for visitors who declined).
 */
export const cookieStorage: StateStorage = {
  getItem: (name) => {
    if (typeof document === "undefined") return null;
    const prefix = `${name}=`;
    const entry = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
  },
  setItem: (name, value) => {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
  },
  removeItem: (name) => {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  },
};
