import { describe, expect, it } from "vitest";

import {
  getLineKey,
  migrateCartState,
  useCartStore,
  type CartItemInput,
} from "./cart-store";

const shirt: CartItemInput = {
  productId: "shirt",
  slug: "shirt",
  name: "Shirt",
  prices: [],
  size: "M",
  maxQuantity: 5,
};
const scarf: CartItemInput = {
  ...shirt,
  productId: "scarf",
  slug: "scarf",
  name: "Scarf",
  size: undefined,
};

function reset() {
  useCartStore.setState({ byUser: {} });
}
const linesOf = (userId: string) =>
  useCartStore.getState().byUser[userId] ?? [];

describe("per-customer cart", () => {
  it("keeps every customer's cart separate", () => {
    reset();
    const { addItem } = useCartStore.getState();
    addItem("ada", shirt, 2);
    addItem("bob", scarf, 1);

    expect(linesOf("ada").map((l) => l.name)).toEqual(["Shirt"]);
    expect(linesOf("bob").map((l) => l.name)).toEqual(["Scarf"]);
    expect(linesOf("carol")).toEqual([]);
  });

  it("changes in one cart never touch another", () => {
    reset();
    const store = useCartStore.getState();
    store.addItem("ada", shirt);
    store.addItem("bob", shirt);

    store.setQuantity("ada", getLineKey(shirt), 4);
    store.toggleSelected("ada", getLineKey(shirt));
    store.removeItem("bob", getLineKey(shirt));

    expect(linesOf("ada")[0]).toMatchObject({ quantity: 4, selected: false });
    expect(linesOf("bob")).toEqual([]);
  });

  it("adds to an existing line instead of duplicating it, capped at stock", () => {
    reset();
    const { addItem } = useCartStore.getState();
    addItem("ada", shirt, 3);
    addItem("ada", shirt, 4);
    expect(linesOf("ada")).toHaveLength(1);
    expect(linesOf("ada")[0].quantity).toBe(5);
  });

  it("keeps different sizes as different lines", () => {
    reset();
    const { addItem } = useCartStore.getState();
    addItem("ada", shirt);
    addItem("ada", { ...shirt, size: "L" });
    expect(linesOf("ada")).toHaveLength(2);
  });

  it("never goes below 1 or above the stock when setting a quantity", () => {
    reset();
    const store = useCartStore.getState();
    store.addItem("ada", shirt);
    store.setQuantity("ada", getLineKey(shirt), 0);
    expect(linesOf("ada")[0].quantity).toBe(1);
    store.setQuantity("ada", getLineKey(shirt), 99);
    expect(linesOf("ada")[0].quantity).toBe(5);
  });

  it("removes only the selected lines, only for that customer", () => {
    reset();
    const store = useCartStore.getState();
    store.addItem("ada", shirt);
    store.addItem("ada", scarf);
    store.addItem("bob", shirt);
    store.toggleSelected("ada", getLineKey(scarf)); // deselect the scarf

    store.removeSelected("ada");
    expect(linesOf("ada").map((l) => l.name)).toEqual(["Scarf"]);
    expect(linesOf("bob")).toHaveLength(1);
  });

  it("drops the old shared guest cart instead of giving it to whoever signs in first", () => {
    expect(migrateCartState()).toEqual({ byUser: {} });
  });
});
