import { env } from "@/config/env";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { CurrencyCode, RegionCode } from "@/types/region";

import type {
  AdminOrderStatus,
  AdminPaymentStatus,
} from "./admin-orders-service";

/** The moves staff can make; paying and refunding have their own paths. */
export type StaffTargetStatus = "in_delivery" | "completed" | "cancelled";

export interface OrderPerson {
  id: string;
  name: string;
  email: string;
}

/** GET /admin/orders/:number. Money is in minor units, in the order's own currency. */
export interface AdminOrderDetail {
  number: string;
  market: RegionCode;
  currency: CurrencyCode;
  status: AdminOrderStatus;
  /** The moves the server allows for this order right now. */
  allowedNextStatuses: StaffTargetStatus[];
  paymentStatus: AdminPaymentStatus;
  paymentMethod: string;
  paymentActions: { canConfirm: boolean; canReject: boolean };
  paymentProofs: {
    id: string;
    transactionId: string | null;
    hasScreenshot: boolean;
    status: "pending" | "approved" | "rejected";
    submittedAt: string;
    reviewedAt: string | null;
    reviewNote: string | null;
    reviewedBy: OrderPerson | null;
  }[];
  placedAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  contact: { email: string; phone: string };
  amounts: {
    subtotal: number;
    discountTotal: number;
    shippingTotal: number;
    taxTotal: number;
    taxIncluded: boolean | null;
    total: number;
    refundedTotal: number;
    refundableTotal: number;
  };
  shipping: {
    name: string;
    company?: string;
    country: string;
    city: string;
    address: string;
    zip: string;
  };
  billing: {
    country: string;
    city: string;
    address: string;
    zip: string;
  } | null;
  delivery: { carrier: string; trackingNumber: string } | null;
  items: {
    id: string;
    slug: string;
    name: string;
    sku: string;
    color?: string;
    size?: string;
    image?: { src: string; alt: string };
    quantity: number;
    unitAmount: number;
    lineTotal: number;
    restockedQuantity: number;
  }[];
  history: {
    from: AdminOrderStatus | null;
    to: AdminOrderStatus;
    actorType: string;
    actor: OrderPerson | null;
    note: string | null;
    at: string;
  }[];
  refunds: {
    id: string;
    amount: number;
    currency: CurrencyCode;
    reason: string;
    restock: boolean;
    by: OrderPerson | null;
    createdAt: string;
  }[];
}

const base = (number: string) => `/admin/orders/${encodeURIComponent(number)}`;

export async function fetchAdminOrder(
  number: string,
): Promise<AdminOrderDetail> {
  const answer = await apiGet<{ order: AdminOrderDetail } | AdminOrderDetail>(
    base(number),
  );
  return "order" in answer ? answer.order : answer;
}

export type StatusChange =
  | { status: "in_delivery"; carrier: string; trackingNumber: string }
  | { status: "completed" }
  | { status: "cancelled"; reason?: string };

export const changeOrderStatus = (number: string, change: StatusChange) =>
  apiPost(`${base(number)}/status`, change);

export const updateTracking = (
  number: string,
  body: { carrier: string; trackingNumber: string },
) => apiPatch(`${base(number)}/tracking`, body);

export const confirmPayment = (number: string, note?: string) =>
  apiPost(`${base(number)}/payment/confirm`, note ? { note } : {});

export const rejectPayment = (number: string, reason: string) =>
  apiPost(`${base(number)}/payment/reject`, { reason });

export const createRefund = (
  number: string,
  body: { amount: number; reason: string; restock: boolean },
) => apiPost(`${base(number)}/refunds`, body);

/** The customer's payment screenshot: private, shown only to staff who may verify payments. */
export const screenshotUrl = (number: string, proofId: string) =>
  `${env.NEXT_PUBLIC_API_URL}${base(number)}/payment-proofs/${encodeURIComponent(proofId)}/screenshot`;
