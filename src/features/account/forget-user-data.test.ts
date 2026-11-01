import { beforeEach, describe, expect, it } from "vitest";

import { useAddressStore } from "@/stores/address-store";
import { useCartStore } from "@/stores/cart-store";
import { useOrderHistoryStore } from "@/stores/order-history-store";
import { useOrderStore } from "@/stores/order-store";
import { useWishlistStore } from "@/stores/wishlist-store";

import { forgetUserData } from "./forget-user-data";

const address = {
  id: "a1",
  fullName: "Ada",
  phone: "+49 170 1234567",
  country: "Germany",
  city: "Berlin",
  address: "Secret Street 1",
  zip: "10115",
  isDefault: true,
};
// The stores only care about the shape of the per-user maps here.
const anything = (value: unknown) => value as never;

beforeEach(() => {
  useCartStore.setState({
    byUser: { ada: anything([{ key: "x" }]), bob: anything([{ key: "y" }]) },
  });
  useWishlistStore.setState({
    byUser: { ada: anything([{ id: "p1" }]), bob: anything([{ id: "p2" }]) },
  });
  useAddressStore.setState({ byUser: { ada: [address], bob: [address] } });
  useOrderHistoryStore.setState({
    byUser: { ada: anything([{ id: "o1" }]), bob: anything([{ id: "o2" }]) },
  });
  useOrderStore.setState({ lastOrder: anything({ id: "o1" }) });
});

describe("forgetUserData", () => {
  it("removes the deleted customer's cart, wishlist, addresses and orders", () => {
    forgetUserData("ada");

    expect(useCartStore.getState().byUser).not.toHaveProperty("ada");
    expect(useWishlistStore.getState().byUser).not.toHaveProperty("ada");
    expect(useAddressStore.getState().byUser).not.toHaveProperty("ada");
    expect(useOrderHistoryStore.getState().byUser).not.toHaveProperty("ada");
    expect(useOrderStore.getState().lastOrder).toBeNull();
  });

  it("leaves other customers on the same device untouched", () => {
    forgetUserData("ada");

    expect(Object.keys(useCartStore.getState().byUser)).toEqual(["bob"]);
    expect(Object.keys(useWishlistStore.getState().byUser)).toEqual(["bob"]);
    expect(Object.keys(useAddressStore.getState().byUser)).toEqual(["bob"]);
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
