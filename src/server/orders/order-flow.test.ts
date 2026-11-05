import { describe, expect, it } from "vitest";

import {
  canStaffDelete,
  canStaffMove,
  nextStaffStatuses,
  orderMoves,
  paymentActions,
} from "./order-flow";

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

  describe("cash on delivery", () => {
    const unpaid = { method: "cod", paymentStatus: "pending" } as const;

    it("can be cancelled while nobody has paid it, even though it is processing", () => {
      expect(canStaffMove("processing", "cancelled", unpaid)).toBe(true);
      expect(canStaffMove("in_delivery", "cancelled", unpaid)).toBe(true);
      expect(nextStaffStatuses("processing", unpaid)).toEqual([
        "cancelled",
        "in_delivery",
      ]);
    });

    it("cannot be cancelled once the cash is collected, or after it is finished", () => {
      const paid = { method: "cod", paymentStatus: "paid" } as const;
      expect(canStaffMove("processing", "cancelled", paid)).toBe(false);
      expect(canStaffMove("completed", "cancelled", unpaid)).toBe(false);
      expect(canStaffMove("cancelled", "cancelled", unpaid)).toBe(false);
    });

    it("is not special for any other way of paying", () => {
      for (const method of ["card", "bank_transfer", "easypaisa", "jazzcash"]) {
        expect(
          canStaffMove("processing", "cancelled", {
            method,
            paymentStatus: "pending",
          }),
        ).toBe(false);
      }
    });
  });
});

describe("what staff may do about the money", () => {
  const actions = (
    method: string,
    status: Parameters<typeof paymentActions>[0]["status"],
    paymentStatus: Parameters<typeof paymentActions>[0]["paymentStatus"],
  ) => paymentActions({ method, status, paymentStatus });

  it("confirms cash once the order is with staff or on its way, and only once", () => {
    for (const status of ["processing", "in_delivery", "completed"] as const) {
      expect(actions("cod", status, "pending")).toEqual({
        canConfirm: true,
        canReject: false,
      });
    }
    expect(actions("cod", "processing", "paid").canConfirm).toBe(false);
    expect(actions("cod", "cancelled", "pending").canConfirm).toBe(false);
    expect(actions("cod", "processing", "refunded").canConfirm).toBe(false);
  });

  it("confirms a transfer that is waiting, with or without a proof", () => {
    for (const method of ["bank_transfer", "easypaisa", "jazzcash"]) {
      for (const paymentStatus of [
        "pending",
        "failed",
        "awaiting_verification",
      ] as const) {
        expect(
          actions(method, "waiting_payment", paymentStatus).canConfirm,
        ).toBe(true);
      }
      expect(actions(method, "processing", "paid").canConfirm).toBe(false);
      expect(actions(method, "cancelled", "pending").canConfirm).toBe(false);
    }
  });

  it("rejects only a proof that is waiting to be checked", () => {
    expect(
      actions("bank_transfer", "waiting_payment", "awaiting_verification"),
    ).toEqual({
      canConfirm: true,
      canReject: true,
    });
    for (const paymentStatus of ["pending", "failed", "paid"] as const) {
      expect(
        actions("bank_transfer", "waiting_payment", paymentStatus).canReject,
      ).toBe(false);
    }
  });

  it("never confirms a card by hand", () => {
    expect(actions("card", "waiting_payment", "pending")).toEqual({
      canConfirm: false,
      canReject: false,
    });
  });
});

describe("the status dropdown of the order list", () => {
  const order = (
    status: Parameters<typeof orderMoves>[0]["status"],
    over: Partial<Parameters<typeof orderMoves>[0]> = {},
  ) => ({
    status,
    method: "bank_transfer",
    paymentStatus: "pending" as const,
    deletedAt: null,
    ...over,
  });

  it("offers a pending transfer order: confirm the payment, or cancel", () => {
    expect(orderMoves(order("waiting_payment"))).toEqual([
      "processing",
      "cancelled",
    ]);
  });

  it("offers a processing order only the next step", () => {
    expect(orderMoves(order("processing", { paymentStatus: "paid" }))).toEqual([
      "in_delivery",
    ]);
    expect(orderMoves(order("in_delivery", { paymentStatus: "paid" }))).toEqual(
      ["completed"],
    );
  });

  it("offers an unpaid cash-on-delivery order a cancel as well", () => {
    expect(orderMoves(order("processing", { method: "cod" }))).toEqual([
      "in_delivery",
      "cancelled",
    ]);
  });

  it("never offers Processing for a card order or for an order that is already processing", () => {
    expect(orderMoves(order("waiting_payment", { method: "card" }))).toEqual([
      "cancelled",
    ]);
    expect(orderMoves(order("processing", { method: "cod" }))).not.toContain(
      "processing",
    );
  });

  it("offers a cancelled order only Delete, once", () => {
    expect(orderMoves(order("cancelled"))).toEqual(["deleted"]);
    expect(orderMoves(order("cancelled", { deletedAt: new Date() }))).toEqual(
      [],
    );
  });

  it("locks a delivered order, a refunded one and a deleted one", () => {
    expect(orderMoves(order("completed", { paymentStatus: "paid" }))).toEqual(
      [],
    );
    expect(
      orderMoves(order("refunded", { paymentStatus: "refunded" })),
    ).toEqual([]);
  });

  it("deletes only a cancelled order that is not deleted yet", () => {
    expect(canStaffDelete({ status: "cancelled", deletedAt: null })).toBe(true);
    expect(canStaffDelete({ status: "completed", deletedAt: null })).toBe(
      false,
    );
    expect(canStaffDelete({ status: "waiting_payment", deletedAt: null })).toBe(
      false,
    );
    expect(canStaffDelete({ status: "cancelled", deletedAt: new Date() })).toBe(
      false,
    );
  });
});
