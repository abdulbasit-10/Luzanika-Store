import { beforeEach, describe, expect, it, vi } from "vitest";

import { savePendingAction, takePendingAction } from "./pending-action";

const VARIANT = "3f2c1a3e-4b5d-4c6e-8f70-123456789abc";
const PRODUCT = "9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d";

/** A tiny stand-in for the browser's sessionStorage (these tests run in Node). */
function fakeSessionStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

let session: ReturnType<typeof fakeSessionStorage>;

beforeEach(() => {
  session = fakeSessionStorage();
  vi.stubGlobal("window", { sessionStorage: session });
  vi.useRealTimers();
});

describe("pending action", () => {
  it("returns a saved cart action once, then forgets it", () => {
    savePendingAction({
      kind: "cart",
      variantId: VARIANT,
      quantity: 2,
      name: "Shirt",
    });

    expect(takePendingAction()).toEqual({
      kind: "cart",
      variantId: VARIANT,
      quantity: 2,
      name: "Shirt",
    });
    expect(takePendingAction()).toBeNull();
  });

  it("returns a saved wishlist action", () => {
    savePendingAction({ kind: "wishlist", productId: PRODUCT, name: "Bag" });

    expect(takePendingAction()).toEqual({
      kind: "wishlist",
      productId: PRODUCT,
      name: "Bag",
    });
  });

  it("keeps only the latest action", () => {
    savePendingAction({ kind: "wishlist", productId: PRODUCT, name: "Bag" });
    savePendingAction({
      kind: "cart",
      variantId: VARIANT,
      quantity: 1,
      name: "Shirt",
    });

    expect(takePendingAction()?.kind).toBe("cart");
  });

  it("drops an action that is more than 30 minutes old", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    savePendingAction({ kind: "wishlist", productId: PRODUCT, name: "Bag" });

    vi.setSystemTime(new Date("2026-01-01T10:31:00Z"));
    expect(takePendingAction()).toBeNull();
  });

  it.each([
    ["not JSON", "{oops"],
    ["not an object", "5"],
    ["an unknown kind", JSON.stringify({ kind: "order", at: Date.now() })],
    [
      "a cart action with a bad id",
      JSON.stringify({
        kind: "cart",
        variantId: "../../x",
        quantity: 1,
        name: "x",
        at: Date.now(),
      }),
    ],
    [
      "a cart action with a bad quantity",
      JSON.stringify({
        kind: "cart",
        variantId: VARIANT,
        quantity: 1000,
        name: "x",
        at: Date.now(),
      }),
    ],
    [
      "a wishlist action with a bad id",
      JSON.stringify({
        kind: "wishlist",
        productId: "nope",
        name: "x",
        at: Date.now(),
      }),
    ],
    [
      "no timestamp",
      JSON.stringify({ kind: "wishlist", productId: PRODUCT, name: "x" }),
    ],
  ])("ignores %s", (_label, stored) => {
    session.setItem("luzanika-pending-action", stored);

    expect(takePendingAction()).toBeNull();
    expect(session.getItem("luzanika-pending-action")).toBeNull();
  });
});
