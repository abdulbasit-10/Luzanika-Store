import { apiGet, apiPost } from "@/lib/api-client";
import type { CurrencyCode, RegionCode } from "@/types/region";

export type CustomerStatus = "active" | "blocked" | "anonymised";

export interface CustomerListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: CustomerStatus;
  orderCount: number;
  lastOrderAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CustomerPage {
  items: CustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Customer {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  language: string;
  status: CustomerStatus;
  createdAt: string;
  lastLoginAt: string | null;
  anonymisedAt: string | null;
  activeSessions: number;
  addresses: {
    id: string;
    fullName: string;
    phone: string;
    country: string;
    city: string;
    address: string;
    zip: string;
    isDefault: boolean;
  }[];
  /** Per currency, never added across currencies. Minor units. */
  spend: {
    currency: CurrencyCode;
    orders: number;
    paid: number;
    refunded: number;
    net: number;
  }[];
  /** The newest 100 orders. */
  orders: {
    number: string;
    market: RegionCode;
    currency: CurrencyCode;
    status: string;
    paymentStatus: string;
    total: number;
    placedAt: string;
  }[];
}

export interface CustomerFilters {
  search?: string;
  status?: CustomerStatus;
}

export const fetchCustomers = (
  filters: CustomerFilters,
  page: number,
  pageSize: number,
) =>
  apiGet<CustomerPage>("/admin/customers", {
    params: {
      search: filters.search?.trim() || undefined,
      status: filters.status,
      page,
      pageSize,
    },
  });

export async function fetchCustomer(id: string): Promise<Customer> {
  const answer = await apiGet<{ customer: Customer } | Customer>(
    `/admin/customers/${encodeURIComponent(id)}`,
  );
  return "customer" in answer ? answer.customer : answer;
}

export const blockCustomer = (id: string, reason: string) =>
  apiPost(`/admin/customers/${encodeURIComponent(id)}/block`, {
    reason: reason.trim(),
  });

export const unblockCustomer = (id: string, note: string) =>
  apiPost(
    `/admin/customers/${encodeURIComponent(id)}/unblock`,
    note.trim() ? { note: note.trim() } : {},
  );
