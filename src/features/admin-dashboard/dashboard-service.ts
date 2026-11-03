import { apiGet } from "@/lib/api-client";
import type { CurrencyCode, RegionCode } from "@/types/region";

import type {
  AdminOrderStatus,
  AdminPaymentStatus,
} from "@/features/admin-orders/admin-orders-service";

export interface DashboardDay {
  /** yyyy-mm-dd (UTC). */
  date: string;
  orders: number;
  /** Minor units of the market's currency. */
  paidAmount: number;
  refundedAmount: number;
  revenue: number;
}

/** The figures of one market, always in that market's own currency. */
export interface DashboardMarket {
  currency: CurrencyCode;
  orders: { total: number; byStatus: Record<AdminOrderStatus, number> };
  paid: { orders: number; amount: number };
  refunded: { refunds: number; amount: number };
  revenue: number;
  waitingPayment: number;
  awaitingShipment: number;
  series: DashboardDay[];
}

export interface DashboardRecentOrder {
  number: string;
  market: RegionCode;
  currency: CurrencyCode;
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus;
  total: number;
  recipient: string;
  email: string;
  placedAt: string;
}

/** GET /admin/dashboard. The markets are never added together; each has its own block. */
export interface DashboardData {
  period: { from: string; to: string; days: number };
  markets: Partial<Record<RegionCode, DashboardMarket>>;
  newCustomers: number;
  recentOrders: DashboardRecentOrder[];
}

export interface DashboardQuery {
  market?: RegionCode;
  /** A day, yyyy-mm-dd. */
  from: string;
  /** A day, yyyy-mm-dd; the whole day counts. */
  to: string;
}

export function fetchDashboard(query: DashboardQuery): Promise<DashboardData> {
  return apiGet<DashboardData>("/admin/dashboard", { params: query });
}
