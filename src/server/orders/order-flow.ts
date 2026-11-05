import type {
  OrderStatus,
  PaymentStatus,
} from "@/server/repositories/order-repository";

/** The moves staff can make to an order's status. Paying and refunding have their own paths. */
export type StaffTargetStatus = "in_delivery" | "completed" | "cancelled";

/** What decides whether a cash-on-delivery order may be cancelled: nobody has paid it yet. */
export interface PaymentFacts {
  method: string;
  paymentStatus: PaymentStatus;
}

/**
 * The allowed moves, and nothing else; there is no going back.
 *
 *   waiting_payment -> cancelled     (staff cancel an order nobody has paid)
 *   processing      -> in_delivery   (it was packed and handed over for delivery)
 *   in_delivery     -> completed     (it arrived)
 *
 * A paid order is never "cancelled": it is refunded (see refund-rules), because
 * "cancelled" means the stock was released and no money was taken.
 *
 * One more way to cancel: a cash-on-delivery order is "processing" from the
 * start but nobody has paid it until the cash is collected, so while it is
 * unpaid, staff can still cancel it (a fake order, a parcel refused at the door).
 */
const MOVES: Record<StaffTargetStatus, OrderStatus> = {
  cancelled: "waiting_payment",
  in_delivery: "processing",
  completed: "in_delivery",
};

/** What staff see for each status. The stored values stay the same. */
export const ORDER_STATUS_NAMES: Record<OrderStatus, string> = {
  waiting_payment: "Pending",
  processing: "Processing",
  in_delivery: "Shipped",
  completed: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function isUnpaidCod(from: OrderStatus, payment?: PaymentFacts): boolean {
  return (
    payment?.method === "cod" &&
    payment.paymentStatus === "pending" &&
    (from === "processing" || from === "in_delivery")
  );
}

export function canStaffMove(
  from: OrderStatus,
  to: StaffTargetStatus,
  payment?: PaymentFacts,
): boolean {
  return (
    MOVES[to] === from || (to === "cancelled" && isUnpaidCod(from, payment))
  );
}

/** Where an order can go next, for the admin to show only the buttons that work. */
export function nextStaffStatuses(
  from: OrderStatus,
  payment?: PaymentFacts,
): StaffTargetStatus[] {
  return (Object.keys(MOVES) as StaffTargetStatus[]).filter((to) =>
    canStaffMove(from, to, payment),
  );
}

/**
 * What staff may do about the money of an order right now:
 *  - confirm: cash on delivery, once the cash is collected (the order is with staff or on its way), or a
 *    bank / Easypaisa / JazzCash order that still waits for its payment (staff saw the money arrive);
 *  - reject: the customer's proof does not check out, so they are asked to send another.
 */
export function paymentActions(order: {
  method: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}): { canConfirm: boolean; canReject: boolean } {
  if (order.method === "cod") {
    return {
      canConfirm:
        order.paymentStatus === "pending" &&
        (order.status === "processing" ||
          order.status === "in_delivery" ||
          order.status === "completed"),
      canReject: false,
    };
  }
  const transfer =
    order.method === "bank_transfer" ||
    order.method === "easypaisa" ||
    order.method === "jazzcash";
  const waiting = transfer && order.status === "waiting_payment";
  return {
    canConfirm:
      waiting &&
      (order.paymentStatus === "pending" ||
        order.paymentStatus === "failed" ||
        order.paymentStatus === "awaiting_verification"),
    canReject: waiting && order.paymentStatus === "awaiting_verification",
  };
}

/**
 * Only a cancelled order can be deleted, and only once. Deleting hides it from
 * the order list; the record stays. A delivered order is locked for good.
 */
export function canStaffDelete(order: {
  status: OrderStatus;
  deletedAt: Date | null;
}): boolean {
  return order.status === "cancelled" && order.deletedAt === null;
}

/** Everything a staff member can do with an order from the list's status dropdown. */
export type OrderMove = StaffTargetStatus | "processing" | "deleted";

/**
 * The dropdown's choices for one order, in the order they are offered. "processing"
 * is how a pending order moves on: staff confirm that the payment arrived (the
 * same thing as the Confirm payment button). Nothing is offered for a deleted order.
 */
export function orderMoves(order: {
  status: OrderStatus;
  method: string;
  paymentStatus: PaymentStatus;
  deletedAt: Date | null;
}): OrderMove[] {
  if (order.deletedAt !== null) return [];
  const moves: OrderMove[] = [];
  if (order.status === "waiting_payment" && paymentActions(order).canConfirm) {
    moves.push("processing");
  }
  // Cancel is always the last of the moves that change the status.
  const next = nextStaffStatuses(order.status, order);
  moves.push(...next.filter((move) => move !== "cancelled"));
  if (next.includes("cancelled")) moves.push("cancelled");
  if (canStaffDelete(order)) moves.push("deleted");
  return moves;
}
