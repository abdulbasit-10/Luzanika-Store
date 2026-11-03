import { parseMajorToMinor } from "@/features/admin-shell/admin-money";

/** The checks of the forms on the order page, so people hear what is wrong before the server says no. */

export interface ShippingValues {
  carrier: string;
  trackingNumber: string;
}

export function shippingProblems(
  values: ShippingValues,
): Partial<Record<keyof ShippingValues, string>> {
  const problems: Partial<Record<keyof ShippingValues, string>> = {};
  if (!values.carrier.trim()) problems.carrier = "Enter the carrier";
  else if (values.carrier.trim().length > 80) {
    problems.carrier = "Keep it under 80 characters";
  }
  if (!values.trackingNumber.trim()) {
    problems.trackingNumber = "Enter the tracking number";
  } else if (values.trackingNumber.trim().length > 120) {
    problems.trackingNumber = "Keep it under 120 characters";
  }
  return problems;
}

export interface RefundValues {
  amount: string;
  reason: string;
}

/** A refund in the order's own currency, never above what can still be refunded (minor units). */
export function refundProblems(
  values: RefundValues,
  refundable: number,
): Partial<Record<keyof RefundValues, string>> {
  const problems: Partial<Record<keyof RefundValues, string>> = {};
  const minor = parseMajorToMinor(values.amount);
  if (minor === null || minor < 1) {
    problems.amount = "Enter an amount above zero, like 1500 or 12.50";
  } else if (minor > refundable) {
    problems.amount = "That is more than can still be refunded";
  }
  if (!values.reason.trim()) problems.reason = "Please give a reason";
  else if (values.reason.trim().length > 500) {
    problems.reason = "Keep it under 500 characters";
  }
  return problems;
}

/** The text of the amount box for "refund everything that is left": 1190 or 895.9. */
export function majorText(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}
