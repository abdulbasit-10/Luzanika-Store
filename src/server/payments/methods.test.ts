import { describe, expect, it } from "vitest";

import {
  PAYMENT_METHODS,
  allowedInMarket,
  isOfflineMethod,
  isTransferMethod,
  methodsForMarket,
} from "./methods";

describe("payment methods", () => {
  it("knows which methods are paid by transfer and which need no gateway", () => {
    expect(PAYMENT_METHODS.filter(isTransferMethod)).toEqual([
      "bank_transfer",
      "easypaisa",
      "jazzcash",
    ]);
    expect(PAYMENT_METHODS.filter(isOfflineMethod)).toEqual([
      "cod",
      "bank_transfer",
      "easypaisa",
      "jazzcash",
    ]);
    expect(isTransferMethod("cod")).toBe(false);
    expect(isTransferMethod("nonsense")).toBe(false);
  });

  it("offers Pakistan cash and transfers, and Germany cards", () => {
    expect(methodsForMarket("PK")).toEqual([
      "cod",
      "bank_transfer",
      "easypaisa",
      "jazzcash",
    ]);
    expect(methodsForMarket("DE")).toEqual(["card"]);
  });

  it("keeps cash and transfers out of Germany", () => {
    for (const method of PAYMENT_METHODS) {
      expect(allowedInMarket(method, "PK")).toBe(true);
      expect(allowedInMarket(method, "DE")).toBe(method === "card");
    }
  });
});
