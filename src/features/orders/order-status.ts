import type { OrderStatus } from "@/features/orders/types";

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "waiting_payment", label: "Waiting payment" },
  { value: "processing", label: "Process" },
  { value: "in_delivery", label: "In Delivery" },
  { value: "completed", label: "Complete Order" },
  { value: "cancelled", label: "Cancelled" },
];

export const orderStatusLabels: Record<OrderStatus, string> = {
  ...Object.fromEntries(
    ORDER_STATUSES.map(({ value, label }) => [value, label]),
  ),
  refunded: "Refunded",
} as Record<OrderStatus, string>;

export { paymentMethodLabels } from "@/features/orders/payment-methods";

export const orderDateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** "45 minutes", or "2 hours" once it is long: transfers are held for many hours. */
export function formatTimeLeft(minutes: number): string {
  if (minutes < 120)
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  return `${Math.round(minutes / 60)} hours`;
}

/** Whole minutes left to pay, never below 0. Null when there is no deadline. */
export function minutesToPay(
  reservationExpiresAt: string | null,
  now = Date.now(),
): number | null {
  if (!reservationExpiresAt) return null;
  return Math.max(
    0,
    Math.ceil((Date.parse(reservationExpiresAt) - now) / 60_000),
  );
}
