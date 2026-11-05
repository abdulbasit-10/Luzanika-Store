import { REGIONS } from "@/config/regions";
import { formatMinor } from "@/features/admin-shell/admin-money";
import type { CurrencyCode, RegionCode } from "@/types/region";

import type {
  AdminOrderFilterStatus,
  AdminOrderMove,
  AdminOrderStatus,
  AdminPaymentStatus,
} from "./admin-orders-service";

export const ORDER_STATUS_OPTIONS: {
  value: AdminOrderStatus;
  label: string;
}[] = [
  { value: "waiting_payment", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "in_delivery", label: "Shipped" },
  { value: "completed", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

/** The status filter: every status, then the orders staff deleted (hidden from the other choices). */
export const ORDER_FILTER_OPTIONS: {
  value: AdminOrderFilterStatus;
  label: string;
}[] = [...ORDER_STATUS_OPTIONS, { value: "deleted", label: "Deleted" }];

export const PAYMENT_STATUS_OPTIONS: {
  value: AdminPaymentStatus;
  label: string;
}[] = [
  { value: "pending", label: "Pending" },
  { value: "awaiting_verification", label: "Awaiting verification" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "partially_refunded", label: "Partly refunded" },
  { value: "refunded", label: "Refunded" },
];

export const orderStatusLabel = (status: AdminOrderStatus) =>
  ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
  status;

export const paymentStatusLabel = (status: AdminPaymentStatus) =>
  PAYMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
  status;

/** The three chip colours of the Figma: yellow (still going), green (done), red (stopped). */
export type StatusTone = "pending" | "success" | "failed" | "neutral";

export const ORDER_STATUS_TONE: Record<AdminOrderStatus, StatusTone> = {
  waiting_payment: "pending",
  processing: "pending",
  in_delivery: "pending",
  completed: "success",
  cancelled: "failed",
  refunded: "failed",
};

/** The dropdown choices, as staff read them. */
export const ORDER_MOVE_LABEL: Record<AdminOrderMove, string> = {
  processing: "Processing",
  in_delivery: "Shipped",
  completed: "Delivered",
  cancelled: "Cancel order",
  deleted: "Delete order",
};

export const regionName = (market: RegionCode) => REGIONS[market].name;

/** "PKR 8,500" or "EUR 75.50" (see formatMinor). */
export const formatOrderTotal = (minorUnits: number, currency: CurrencyCode) =>
  formatMinor(minorUnits, currency);
