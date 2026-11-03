import { describe, expect, it } from "vitest";

import {
  majorText,
  refundProblems,
  shippingProblems,
} from "./order-detail-forms";

describe("shippingProblems", () => {
  it("needs a carrier and a tracking number", () => {
    expect(shippingProblems({ carrier: " ", trackingNumber: "" })).toEqual({
      carrier: "Enter the carrier",
      trackingNumber: "Enter the tracking number",
    });
    expect(shippingProblems({ carrier: "TCS", trackingNumber: "123" })).toEqual(
      {},
    );
  });
});

describe("refundProblems", () => {
  const ok = { amount: "500", reason: "Damaged" };

  it("accepts an amount up to what can still be refunded", () => {
    expect(refundProblems(ok, 50000)).toEqual({});
    expect(refundProblems({ ...ok, amount: "12.50" }, 50000)).toEqual({});
  });

  it("refuses more than is left, and amounts that are not amounts", () => {
    expect(refundProblems({ ...ok, amount: "500.01" }, 50000).amount).toMatch(
      /more than/,
    );
    expect(refundProblems({ ...ok, amount: "0" }, 50000).amount).toBeDefined();
    expect(
      refundProblems({ ...ok, amount: "ten" }, 50000).amount,
    ).toBeDefined();
  });

  it("needs a reason", () => {
    expect(refundProblems({ ...ok, reason: "  " }, 50000).reason).toBe(
      "Please give a reason",
    );
  });
});

describe("majorText", () => {
  it("writes minor units as the amount a person would type", () => {
    expect(majorText(119000)).toBe("1190");
    expect(majorText(89590)).toBe("895.90");
  });
});
