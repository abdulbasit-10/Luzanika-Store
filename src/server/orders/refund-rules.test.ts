import { describe, expect, it } from "vitest";

import {
  planRefund,
  refundableTotal,
  RefundRuleError,
  type RefundableOrder,
} from "./refund-rules";

const order = (overrides: Partial<RefundableOrder> = {}): RefundableOrder => ({
  status: "processing",
  paymentStatus: "paid",
  total: 10_000,
  refundedTotal: 0,
  items: [
    { id: "a", variantId: "va", quantity: 2, restockedQuantity: 0 },
    { id: "b", variantId: "vb", quantity: 1, restockedQuantity: 0 },
  ],
  ...overrides,
});

const refused = (fn: () => unknown, field: string | null, message?: RegExp) => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(RefundRuleError);
    expect((error as RefundRuleError).field).toBe(field);
    if (message) expect((error as Error).message).toMatch(message);
    return;
  }
  throw new Error("expected the refund to be refused");
};

describe("refundableTotal", () => {
  it("is what was paid minus what was already refunded", () => {
    expect(refundableTotal(order())).toBe(10_000);
    expect(
      refundableTotal(
        order({ paymentStatus: "partially_refunded", refundedTotal: 4_000 }),
      ),
    ).toBe(6_000);
  });

  it("is zero until the order is paid, and once it is refunded in full", () => {
    expect(refundableTotal(order({ paymentStatus: "pending" }))).toBe(0);
    expect(refundableTotal(order({ paymentStatus: "failed" }))).toBe(0);
    expect(
      refundableTotal(
        order({
          status: "refunded",
          paymentStatus: "refunded",
          refundedTotal: 10_000,
        }),
      ),
    ).toBe(0);
  });
});

describe("planRefund", () => {
  it("a partial refund keeps the order's status and marks it partially refunded", () => {
    const plan = planRefund(order(), { amount: 2_500, restock: false });

    expect(plan).toMatchObject({
      amount: 2_500,
      restock: [],
      refundedTotal: 2_500,
      fullyRefunded: false,
      next: { paymentStatus: "partially_refunded" },
    });
    expect(plan.next.status).toBeUndefined();
    expect(plan.next.stockState).toBeUndefined();
  });

  it("a full refund ends the order as refunded", () => {
    const plan = planRefund(order(), { amount: 10_000, restock: false });

    expect(plan.fullyRefunded).toBe(true);
    expect(plan.next).toEqual({
      status: "refunded",
      paymentStatus: "refunded",
    });
  });

  it("several partial refunds add up to a full one", () => {
    const first = planRefund(order(), { amount: 4_000, restock: false });
    const second = planRefund(
      order({
        paymentStatus: "partially_refunded",
        refundedTotal: first.refundedTotal,
      }),
      { amount: 6_000, restock: false },
    );

    expect(second.fullyRefunded).toBe(true);
    expect(second.next.status).toBe("refunded");
  });

  it("refuses more than is left, nothing, a fraction and a negative amount", () => {
    refused(
      () => planRefund(order(), { amount: 10_001, restock: false }),
      "amount",
      /10000/,
    );
    refused(
      () =>
        planRefund(
          order({ paymentStatus: "partially_refunded", refundedTotal: 9_000 }),
          {
            amount: 1_001,
            restock: false,
          },
        ),
      "amount",
      /1000/,
    );
    refused(() => planRefund(order(), { amount: 0, restock: false }), "amount");
    refused(
      () => planRefund(order(), { amount: -5, restock: false }),
      "amount",
    );
    refused(
      () => planRefund(order(), { amount: 10.5, restock: false }),
      "amount",
    );
  });

  it("refuses an order nobody paid, and one already refunded in full", () => {
    refused(
      () =>
        planRefund(
          order({ paymentStatus: "pending", status: "waiting_payment" }),
          { amount: 1, restock: false },
        ),
      null,
      /not been paid/,
    );
    refused(
      () =>
        planRefund(order({ paymentStatus: "pending", status: "cancelled" }), {
          amount: 1,
          restock: false,
        }),
      null,
      /never paid/,
    );
    refused(
      () =>
        planRefund(
          order({
            status: "refunded",
            paymentStatus: "refunded",
            refundedTotal: 10_000,
          }),
          { amount: 1, restock: false },
        ),
      null,
      /already been refunded/,
    );
  });

  it("restocks every item not yet back when no items are listed", () => {
    const plan = planRefund(order(), { amount: 10_000, restock: true });

    expect(plan.restock).toEqual([
      { orderItemId: "a", variantId: "va", quantity: 2 },
      { orderItemId: "b", variantId: "vb", quantity: 1 },
    ]);
    // Everything is back on the shelf, so the stock is released too.
    expect(plan.next).toEqual({
      status: "refunded",
      paymentStatus: "refunded",
      stockState: "released",
    });
  });

  it("restocks only the listed items and quantities", () => {
    const plan = planRefund(order(), {
      amount: 3_000,
      restock: true,
      items: [{ orderItemId: "a", quantity: 1 }],
    });

    expect(plan.restock).toEqual([
      { orderItemId: "a", variantId: "va", quantity: 1 },
    ]);
    expect(plan.next.stockState).toBeUndefined();
  });

  it("does not release the stock of a fully refunded order when some items stayed out", () => {
    const plan = planRefund(order(), {
      amount: 10_000,
      restock: true,
      items: [{ orderItemId: "a", quantity: 2 }],
    });

    expect(plan.next).toEqual({
      status: "refunded",
      paymentStatus: "refunded",
    });
  });

  it("never puts back more than was bought, counting earlier refunds", () => {
    const partly = order({
      paymentStatus: "partially_refunded",
      refundedTotal: 3_000,
      items: [{ id: "a", variantId: "va", quantity: 2, restockedQuantity: 1 }],
    });

    expect(
      planRefund(partly, {
        amount: 100,
        restock: true,
        items: [{ orderItemId: "a", quantity: 1 }],
      }).restock,
    ).toHaveLength(1);
    refused(
      () =>
        planRefund(partly, {
          amount: 100,
          restock: true,
          items: [{ orderItemId: "a", quantity: 2 }],
        }),
      "items",
      /Only 1/,
    );
    refused(
      () =>
        planRefund(order(), {
          amount: 100,
          restock: true,
          items: [{ orderItemId: "a", quantity: 3 }],
        }),
      "items",
    );
    refused(
      () =>
        planRefund(order(), {
          amount: 100,
          restock: true,
          items: [{ orderItemId: "a", quantity: 0 }],
        }),
      "items",
    );
  });

  it("refuses items that are not in the order, repeated, or have no variant left", () => {
    refused(
      () =>
        planRefund(order(), {
          amount: 100,
          restock: true,
          items: [{ orderItemId: "zzz", quantity: 1 }],
        }),
      "items",
    );
    refused(
      () =>
        planRefund(order(), {
          amount: 100,
          restock: true,
          items: [
            { orderItemId: "a", quantity: 1 },
            { orderItemId: "a", quantity: 1 },
          ],
        }),
      "items",
      /only once/,
    );
    refused(
      () =>
        planRefund(
          order({
            items: [
              { id: "a", variantId: null, quantity: 1, restockedQuantity: 0 },
            ],
          }),
          { amount: 100, restock: true },
        ),
      "items",
      /variant was removed/,
    );
  });

  it("refuses restocking when everything is already back", () => {
    refused(
      () =>
        planRefund(
          order({
            paymentStatus: "partially_refunded",
            refundedTotal: 100,
            items: [
              { id: "a", variantId: "va", quantity: 1, restockedQuantity: 1 },
            ],
          }),
          { amount: 100, restock: true },
        ),
      "restock",
    );
  });

  it("refuses a list of items when not restocking", () => {
    refused(
      () =>
        planRefund(order(), {
          amount: 100,
          restock: false,
          items: [{ orderItemId: "a", quantity: 1 }],
        }),
      "items",
    );
  });
});
