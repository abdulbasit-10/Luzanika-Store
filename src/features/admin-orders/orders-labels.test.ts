import { describe, expect, it } from "vitest";

import { formatOrderTotal } from "./orders-labels";

describe("formatOrderTotal", () => {
  it("drops the cents of a round amount", () => {
    expect(formatOrderTotal(850000, "PKR")).toBe("PKR 8,500");
    expect(formatOrderTotal(7500, "EUR")).toBe("EUR 75");
  });

  it("shows both decimals when there are cents", () => {
    expect(formatOrderTotal(89590, "EUR")).toBe("EUR 895.90");
    expect(formatOrderTotal(4999, "EUR")).toBe("EUR 49.99");
  });
});
