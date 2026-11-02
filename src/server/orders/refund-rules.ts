import type {
  OrderStatus,
  PaymentStatus,
} from "@/server/repositories/order-repository";

export interface RefundableItem {
  id: string;
  variantId: string | null;
  quantity: number;
  /** Already put back into stock by earlier refunds. */
  restockedQuantity: number;
}

export interface RefundableOrder {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** Minor units. */
  total: number;
  /** Minor units, over all refunds so far. */
  refundedTotal: number;
  items: RefundableItem[];
}

export interface RefundRequest {
  /** Minor units. */
  amount: number;
  /** Put returned items back into stock. Without `items`, every item not yet restocked goes back. */
  restock: boolean;
  items?: { orderItemId: string; quantity: number }[];
}

export interface RefundPlan {
  amount: number;
  /** The items going back into stock (empty when not restocking). */
  restock: { orderItemId: string; variantId: string; quantity: number }[];
  /** What the order becomes. `status` is only set when it changes. */
  next: {
    status?: "refunded";
    paymentStatus: "refunded" | "partially_refunded";
    /** Set when every unit of every item is back in stock. */
    stockState?: "released";
  };
  /** Left to refund after this one. */
  refundedTotal: number;
  fullyRefunded: boolean;
}

/** Why a refund is refused. `field` names the request field to point at, when there is one. */
export class RefundRuleError extends Error {
  constructor(
    message: string,
    readonly field: "amount" | "items" | "restock" | null = null,
  ) {
    super(message);
    this.name = "RefundRuleError";
  }
}

/** Only an order that was paid (and not cancelled or already fully refunded) can be refunded. */
export function refundableTotal(order: RefundableOrder): number {
  const paid =
    order.paymentStatus === "paid" ||
    order.paymentStatus === "partially_refunded";
  if (!paid) return 0;
  return Math.max(0, order.total - order.refundedTotal);
}

/**
 * Works out what a refund does, or refuses it. Pure: the service applies the
 * plan inside a transaction with the order locked.
 */
export function planRefund(
  order: RefundableOrder,
  request: RefundRequest,
): RefundPlan {
  if (order.paymentStatus === "refunded") {
    throw new RefundRuleError("This order has already been refunded in full.");
  }
  if (
    order.paymentStatus !== "paid" &&
    order.paymentStatus !== "partially_refunded"
  ) {
    throw new RefundRuleError(
      order.status === "cancelled"
        ? "A cancelled order was never paid, so there is nothing to refund."
        : "This order has not been paid, so there is nothing to refund.",
    );
  }

  const left = refundableTotal(order);
  if (left === 0) {
    throw new RefundRuleError("This order has already been refunded in full.");
  }
  if (!Number.isInteger(request.amount) || request.amount < 1) {
    throw new RefundRuleError("Enter an amount above zero.", "amount");
  }
  if (request.amount > left) {
    throw new RefundRuleError(
      `At most ${left} (in paisa / cents) can still be refunded for this order.`,
      "amount",
    );
  }

  const restock: RefundPlan["restock"] = [];
  if (!request.restock) {
    if (request.items && request.items.length > 0) {
      throw new RefundRuleError(
        "Items can only be listed when they go back into stock.",
        "items",
      );
    }
  } else {
    const byId = new Map(order.items.map((item) => [item.id, item]));
    const wanted = request.items?.length
      ? request.items
      : order.items
          .map((item) => ({
            orderItemId: item.id,
            quantity: item.quantity - item.restockedQuantity,
          }))
          .filter((line) => line.quantity > 0);

    if (wanted.length === 0) {
      throw new RefundRuleError(
        "Every item of this order is already back in stock.",
        "restock",
      );
    }

    const seen = new Set<string>();
    for (const line of wanted) {
      const item = byId.get(line.orderItemId);
      if (!item) {
        throw new RefundRuleError(
          "One of these items is not in this order.",
          "items",
        );
      }
      if (seen.has(line.orderItemId)) {
        throw new RefundRuleError("List each item only once.", "items");
      }
      seen.add(line.orderItemId);

      const stillOut = item.quantity - item.restockedQuantity;
      if (
        !Number.isInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > stillOut
      ) {
        throw new RefundRuleError(
          `Only ${stillOut} of this item can still go back into stock.`,
          "items",
        );
      }
      if (item.variantId === null) {
        throw new RefundRuleError(
          "This item can no longer be put back into stock because its product variant was removed.",
          "items",
        );
      }
      restock.push({
        orderItemId: item.id,
        variantId: item.variantId,
        quantity: line.quantity,
      });
    }
  }

  const refundedTotal = order.refundedTotal + request.amount;
  const fullyRefunded = refundedTotal === order.total;

  const restockedNow = new Map(
    restock.map((line) => [line.orderItemId, line.quantity]),
  );
  const everythingBack = order.items.every(
    (item) =>
      item.restockedQuantity + (restockedNow.get(item.id) ?? 0) ===
      item.quantity,
  );

  return {
    amount: request.amount,
    restock,
    refundedTotal,
    fullyRefunded,
    next: {
      ...(fullyRefunded ? { status: "refunded" as const } : {}),
      paymentStatus: fullyRefunded ? "refunded" : "partially_refunded",
      ...(fullyRefunded && everythingBack
        ? { stockState: "released" as const }
        : {}),
    },
  };
}
