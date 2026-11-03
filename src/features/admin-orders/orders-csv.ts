import type { AdminOrderListItem } from "./admin-orders-service";
import {
  orderStatusLabel,
  paymentStatusLabel,
  regionName,
} from "./orders-labels";

const HEADER = [
  "Order",
  "Placed",
  "Customer",
  "Email",
  "Market",
  "Currency",
  "Total",
  "Status",
  "Payment",
  "Items",
];

/**
 * One CSV cell. Customers type their own names, so a value that starts with
 * = + - @ would run as a formula in Excel: a leading apostrophe stops that.
 */
function cell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The orders as CSV text, with the amount as a plain number in major units (8500.00). */
export function ordersToCsv(orders: AdminOrderListItem[]): string {
  const rows = orders.map((order) =>
    [
      order.number,
      order.placedAt,
      order.recipientName,
      order.customerEmail,
      regionName(order.market),
      order.currency,
      (order.total / 100).toFixed(2),
      orderStatusLabel(order.status),
      paymentStatusLabel(order.paymentStatus),
      order.itemCount,
    ]
      .map(cell)
      .join(","),
  );
  return [HEADER.join(","), ...rows].join("\r\n");
}
