import type { PaymentMethod } from "@/features/checkout/checkout-schema";
import type { ConfirmedOrder, OrderStatus } from "@/features/orders/types";

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "waiting_payment", label: "Waiting payment" },
  { value: "processing", label: "Process" },
  { value: "in_delivery", label: "In Delivery" },
  { value: "completed", label: "Complete Order" },
];

export const orderStatusLabels = Object.fromEntries(
  ORDER_STATUSES.map(({ value, label }) => [value, label]),
) as Record<OrderStatus, string>;

/** The status of an order; orders without one are "waiting payment" until paid, then "processing". */
export function getOrderStatus(order: ConfirmedOrder): OrderStatus {
  return (
    order.status ??
    (order.paymentStatus === "paid" ? "processing" : "waiting_payment")
  );
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  card: "Credit Card",
  paypal: "PayPal",
  "gift-card": "Gift Card",
};

export const orderDateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
