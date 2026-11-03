import { REGIONS } from "@/config/regions";
import { formatMinor } from "@/features/admin-shell/admin-money";
import type { CurrencyCode, RegionCode } from "@/types/region";

import type {
  AdminOrderStatus,
  AdminPaymentStatus,
} from "./admin-orders-service";

export const ORDER_STATUS_OPTIONS: {
  value: AdminOrderStatus;
  label: string;
}[] = [
  { value: "waiting_payment", label: "Waiting payment" },
  { value: "processing", label: "Processing" },
  { value: "in_delivery", label: "In delivery" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

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
export type StatusTone = "pending" | "success" | "failed";

export const ORDER_STATUS_TONE: Record<AdminOrderStatus, StatusTone> = {
  waiting_payment: "pending",
  processing: "pending",
  in_delivery: "pending",
  completed: "success",
  cancelled: "failed",
  refunded: "failed",
};

export const regionName = (market: RegionCode) => REGIONS[market].name;

/** "PKR 8,500" or "EUR 75.50" (see formatMinor). */
export const formatOrderTotal = (minorUnits: number, currency: CurrencyCode) =>
  formatMinor(minorUnits, currency);
