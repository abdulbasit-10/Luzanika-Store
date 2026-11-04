import type { AdminOrderStatus } from "./admin-orders-service";

export type StepState = "done" | "current" | "todo";

export interface ProgressStep {
  label: string;
  state: StepState;
}

/** The road an order takes when nothing goes wrong, in the order it is walked. */
const STEP_LABELS = ["Placed", "Processing", "In delivery", "Completed"];

/** Which step the order has reached (0-based). Completed is the last step and counts as done. */
const STEP_OF: Partial<Record<AdminOrderStatus, number>> = {
  waiting_payment: 0,
  processing: 1,
  in_delivery: 2,
  completed: 3,
};

/**
 * The progress line of the order page. An order that was cancelled or refunded
 * has left the road, so it has no steps (the page shows a red end state instead).
 */
export function orderProgress(status: AdminOrderStatus): ProgressStep[] | null {
  const reached = STEP_OF[status];
  if (reached === undefined) return null;
  return STEP_LABELS.map((label, index) => ({
    label,
    state:
      status === "completed" || index < reached
        ? "done"
        : index === reached
          ? "current"
          : "todo",
  }));
}
