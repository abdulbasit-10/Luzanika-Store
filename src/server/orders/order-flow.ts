import type { OrderStatus } from "@/server/repositories/order-repository";

/** The moves staff can make to an order's status. Paying and refunding have their own paths. */
export type StaffTargetStatus = "in_delivery" | "completed" | "cancelled";

/**
 * The allowed moves, and nothing else; there is no going back.
 *
 *   waiting_payment -> cancelled     (staff cancel an order nobody has paid)
 *   processing      -> in_delivery   (it was packed and handed to a carrier)
 *   in_delivery     -> completed     (it arrived)
 *
 * A paid order is never "cancelled": it is refunded (see refund-rules), because
 * "cancelled" means the stock was released and no money was taken.
 */
const MOVES: Record<StaffTargetStatus, OrderStatus> = {
  cancelled: "waiting_payment",
  in_delivery: "processing",
  completed: "in_delivery",
};

export function canStaffMove(
  from: OrderStatus,
  to: StaffTargetStatus,
): boolean {
  return MOVES[to] === from;
}

/** Where an order can go next, for the admin to show only the buttons that work. */
export function nextStaffStatuses(from: OrderStatus): StaffTargetStatus[] {
  return (Object.keys(MOVES) as StaffTargetStatus[]).filter((to) =>
    canStaffMove(from, to),
  );
}
