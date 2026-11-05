"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The shop's own background jobs and banners (customer session, region, cookie notice) must not run on the admin pages. */
export function ShopOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return <>{children}</>;
}
