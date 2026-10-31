"use client";

import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { CSSProperties } from "react";
import { Toaster as SonnerToaster } from "sonner";

// Import `toast` from here so the library can be swapped in one place.
export { toast } from "sonner";

const styles = {
  "--normal-bg": "var(--surface)",
  "--normal-text": "var(--foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "0.75rem",
  "--width": "22.5rem",
} as CSSProperties;

const below = "calc(var(--header-height) + 0.5rem)";

/** Mounted once in the root layout. Toasts sit under the sticky header, top right. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      theme="light"
      visibleToasts={3}
      offset={{ top: below, right: 16 }}
      mobileOffset={{ top: below, left: 12, right: 12 }}
      style={styles}
      toastOptions={{
        style: {
          fontFamily: "var(--font-sans)",
          fontSize: "0.875rem",
          boxShadow: "var(--shadow-overlay)",
        },
      }}
      icons={{
        success: <CircleCheck aria-hidden className="size-5 text-success" />,
        error: <CircleAlert aria-hidden className="size-5 text-danger" />,
        info: <Info aria-hidden className="size-5 text-accent" />,
      }}
    />
  );
}
