import { apiGet } from "@/lib/api-client";
import type { CurrencyCode, RegionCode } from "@/types/region";

export type AdminOrderStatus =
  | "waiting_payment"
  | "processing"
  | "in_delivery"
  | "completed"
  | "cancelled"
  | "refunded";

export type AdminPaymentStatus =
  | "pending"
  | "awaiting_verification"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

/** One row of GET /admin/orders. Money is in minor units, in the order's own currency. */
export interface AdminOrderListItem {
  number: string;
  market: RegionCode;
  currency: CurrencyCode;
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus;
  total: number;
  refundedTotal: number;
  itemCount: number;
  customerEmail: string;
  recipientName: string;
  customerId: string | null;
  placedAt: string;
  paidAt: string | null;
}

export interface AdminOrderPage {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** What the filter bar can narrow the list by. Empty values mean "all". */
export interface AdminOrderFilters {
  market?: RegionCode;
  status?: AdminOrderStatus;
  paymentStatus?: AdminPaymentStatus;
  /** A day, yyyy-mm-dd. */
  from?: string;
  /** A day, yyyy-mm-dd; the whole day counts. */
  to?: string;
  search?: string;
}

const EXPORT_PAGE_SIZE = 100;
/** A safety stop so an export can never run away: 5,000 orders. */
const EXPORT_MAX_PAGES = 50;

/** GET /admin/orders */
export function fetchAdminOrders(
  filters: AdminOrderFilters,
  page: number,
  pageSize: number,
): Promise<AdminOrderPage> {
  return apiGet<AdminOrderPage>("/admin/orders", {
    params: {
      ...filters,
      search: filters.search?.trim() || undefined,
      page,
      pageSize,
    },
  });
}

/** Every order the filters match, fetched 100 at a time (for the export). */
export async function fetchAllAdminOrders(
  filters: AdminOrderFilters,
): Promise<AdminOrderListItem[]> {
  const all: AdminOrderListItem[] = [];
  for (let page = 1; page <= EXPORT_MAX_PAGES; page++) {
    const answer = await fetchAdminOrders(filters, page, EXPORT_PAGE_SIZE);
    all.push(...answer.items);
    if (all.length >= answer.total || answer.items.length === 0) break;
  }
  return all;
}
