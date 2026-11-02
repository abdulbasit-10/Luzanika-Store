import { describe, expect, it } from "vitest";

import { canStaffMove, nextStaffStatuses } from "./order-flow";

describe("order flow", () => {
  it("allows exactly the three moves", () => {
    expect(canStaffMove("waiting_payment", "cancelled")).toBe(true);
    expect(canStaffMove("processing", "in_delivery")).toBe(true);
    expect(canStaffMove("in_delivery", "completed")).toBe(true);
  });

  it("never skips a step", () => {
    expect(canStaffMove("processing", "completed")).toBe(false);
    expect(canStaffMove("waiting_payment", "in_delivery")).toBe(false);
    expect(canStaffMove("waiting_payment", "completed")).toBe(false);
  });

  it("never cancels a paid order: that is a refund", () => {
    for (const from of [
      "processing",
      "in_delivery",
      "completed",
      "refunded",
    ] as const) {
      expect(canStaffMove(from, "cancelled")).toBe(false);
    }
  });

  it("never goes back or leaves a finished order", () => {
    for (const from of ["completed", "cancelled", "refunded"] as const) {
      expect(nextStaffStatuses(from)).toEqual([]);
    }
    expect(canStaffMove("in_delivery", "in_delivery")).toBe(false);
    expect(canStaffMove("completed", "in_delivery")).toBe(false);
  });

  it("lists what the admin may offer next", () => {
    expect(nextStaffStatuses("waiting_payment")).toEqual(["cancelled"]);
    expect(nextStaffStatuses("processing")).toEqual(["in_delivery"]);
    expect(nextStaffStatuses("in_delivery")).toEqual(["completed"]);
  });
});
