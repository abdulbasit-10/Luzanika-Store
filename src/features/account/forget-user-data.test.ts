import { beforeEach, describe, expect, it } from "vitest";

import { useCartStore } from "@/stores/cart-store";
import { useOrderHistoryStore } from "@/stores/order-history-store";
import { useOrderStore } from "@/stores/order-store";
import { useWishlistStore } from "@/stores/wishlist-store";

import { forgetUserData } from "./forget-user-data";

// The stores only care about the shape of the per-user maps here.
const anything = (value: unknown) => value as never;

beforeEach(() => {
  useCartStore.setState({
    byUser: { ada: anything([{ key: "x" }]), bob: anything([{ key: "y" }]) },
  });
  useWishlistStore.setState({
    byUser: { ada: anything([{ id: "p1" }]), bob: anything([{ id: "p2" }]) },
  });
  useOrderHistoryStore.setState({
    byUser: { ada: anything([{ id: "o1" }]), bob: anything([{ id: "o2" }]) },
  });
  useOrderStore.setState({ lastOrder: anything({ id: "o1" }) });
});

describe("forgetUserData", () => {
  it("removes the deleted customer's cart, wishlist and orders from this browser", () => {
    forgetUserData("ada");

    expect(useCartStore.getState().byUser).not.toHaveProperty("ada");
    expect(useWishlistStore.getState().byUser).not.toHaveProperty("ada");
    expect(useOrderHistoryStore.getState().byUser).not.toHaveProperty("ada");
    expect(useOrderStore.getState().lastOrder).toBeNull();
  });

  it("leaves other customers on the same device untouched", () => {
    forgetUserData("ada");

    expect(Object.keys(useCartStore.getState().byUser)).toEqual(["bob"]);
    expect(Object.keys(useWishlistStore.getState().byUser)).toEqual(["bob"]);
    expect(Object.keys(useOrderHistoryStore.getState().byUser)).toEqual([
      "bob",
    ]);
  });

  it("is harmless for someone with no saved data", () => {
    expect(() => forgetUserData("nobody")).not.toThrow();
    expect(Object.keys(useCartStore.getState().byUser).sort()).toEqual([
      "ada",
      "bob",
    ]);
  });
});
