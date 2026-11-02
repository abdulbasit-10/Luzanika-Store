"use client";

import { useEffect } from "react";

import { useUiStore } from "@/stores/ui-store";

/**
 * Puts the shopper's remembered region (PK or DE) back once the page has
 * loaded. Done here, after the first render, so the first browser render
 * matches the server HTML. Renders nothing.
 */
export function RegionSync() {
  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  return null;
}
