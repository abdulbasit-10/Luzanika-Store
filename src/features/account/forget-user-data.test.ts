import { beforeEach, describe, expect, it } from "vitest";

import { useOrderHistoryStore } from "@/stores/order-history-store";
import { useOrderStore } from "@/stores/order-store";

import { forgetUserData } from "./forget-user-data";

// The stores only care about the shape of the per-user maps here.
const anything = (value: unknown) => value as never;

beforeEach(() => {
  useOrderHistoryStore.setState({
    byUser: { ada: anything([{ id: "o1" }]), bob: anything([{ id: "o2" }]) },
  });
  useOrderStore.setState({ lastOrder: anything({ id: "o1" }) });
});

describe("forgetUserData", () => {
  it("removes the deleted customer's orders from this browser", () => {
    forgetUserData("ada");

    expect(useOrderHistoryStore.getState().byUser).not.toHaveProperty("ada");
    expect(useOrderStore.getState().lastOrder).toBeNull();
  });

  it("leaves other customers on the same device untouched", () => {
    forgetUserData("ada");

    expect(Object.keys(useOrderHistoryStore.getState().byUser)).toEqual([
      "bob",
    ]);
  });

  it("is harmless for someone with no saved data", () => {
    expect(() => forgetUserData("nobody")).not.toThrow();
    expect(Object.keys(useOrderHistoryStore.getState().byUser).sort()).toEqual([
      "ada",
      "bob",
    ]);
  });
});
