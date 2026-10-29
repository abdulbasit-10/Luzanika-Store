"use client";

import { useSyncExternalStore } from "react";

let current = 0;

function subscribe(onChange: () => void) {
  current = Date.now();
  onChange();
  const id = setInterval(() => {
    current = Date.now();
    onChange();
  }, 1000);
  return () => clearInterval(id);
}

function getSnapshot() {
  if (current === 0) current = Date.now();
  return current;
}

/**
 * Current time in ms, ticking every second. Returns null during server
 * rendering and hydration so server and client markup always match.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
