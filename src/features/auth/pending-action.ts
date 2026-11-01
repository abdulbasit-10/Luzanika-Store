const KEY = "luzanika-pending-action";
const MAX_AGE_MS = 30 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Something a visitor tried while logged out ("Add to cart", "Add to
 * wishlist"). It is kept for the length of the tab, so that after they log in
 * the action is carried out for them instead of making them find the product
 * again. Only ids and a display name are kept, never prices or personal data.
 */
export type PendingAction =
  | { kind: "cart"; variantId: string; quantity: number; name: string }
  | { kind: "wishlist"; productId: string; name: string };

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function savePendingAction(action: PendingAction) {
  try {
    storage()?.setItem(KEY, JSON.stringify({ ...action, at: Date.now() }));
  } catch {
    // Storage is full or blocked: the visitor simply adds the item again after logging in.
  }
}

/** Returns the saved action once and forgets it. Null when there is none, it is too old, or it is not valid. */
export function takePendingAction(): PendingAction | null {
  const store = storage();
  if (!store) return null;

  let raw: string | null = null;
  try {
    raw = store.getItem(KEY);
    store.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const item = value as Record<string, unknown>;
    if (typeof item.at !== "number" || Date.now() - item.at > MAX_AGE_MS) {
      return null;
    }
    const name = typeof item.name === "string" ? item.name.slice(0, 160) : "";

    if (
      item.kind === "cart" &&
      typeof item.variantId === "string" &&
      UUID.test(item.variantId) &&
      Number.isInteger(item.quantity) &&
      (item.quantity as number) >= 1 &&
      (item.quantity as number) <= 99
    ) {
      return {
        kind: "cart",
        variantId: item.variantId,
        quantity: item.quantity as number,
        name,
      };
    }
    if (
      item.kind === "wishlist" &&
      typeof item.productId === "string" &&
      UUID.test(item.productId)
    ) {
      return { kind: "wishlist", productId: item.productId, name };
    }
  } catch {
    // A corrupted entry is dropped.
  }
  return null;
}
