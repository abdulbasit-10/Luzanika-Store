import "server-only";

import { recordAudit } from "@/server/audit/audit";
import { withTransaction } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import {
  adminCustomerRepository,
  type CustomerFilter,
  type CustomerRow,
  type CustomerStatus,
} from "@/server/repositories/admin-customer-repository";
import { sessionRepository } from "@/server/repositories/session-repository";
import type { AdminContext } from "@/server/services/staff-admin-service";

const iso = (value: Date | null) =>
  value === null ? null : new Date(value).toISOString();

export interface CustomerListItemDto {
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

export interface CustomerDto {
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
  /** Set when the person deleted their account: their details were wiped. */
  anonymisedAt: string | null;
  /** Browsers currently signed in. */
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
    currency: "PKR" | "EUR";
    orders: number;
    paid: number;
    refunded: number;
    net: number;
  }[];
  /** The newest 100 orders. */
  orders: {
    number: string;
    market: "PK" | "DE";
    currency: "PKR" | "EUR";
    status: string;
    paymentStatus: string;
    total: number;
    placedAt: string;
  }[];
}

const MAX_ORDERS_SHOWN = 100;
const notFound = () => new ApiError("not_found");

export async function listCustomers(
  filter: CustomerFilter,
  page: number,
  pageSize: number,
) {
  const { rows, total } = await adminCustomerRepository.list(
    filter,
    pageSize,
    (page - 1) * pageSize,
  );
  const items: CustomerListItemDto[] = rows.map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    status: row.status,
    orderCount: row.order_count,
    lastOrderAt: iso(row.last_order_at),
    lastLoginAt: iso(row.last_login_at),
    createdAt: new Date(row.created_at).toISOString(),
  }));
  return { items, total, page, pageSize };
}

async function toDto(row: CustomerRow): Promise<CustomerDto> {
  const [addresses, orders, spend] = await Promise.all([
    adminCustomerRepository.listAddresses(row.id),
    adminCustomerRepository.listOrders(row.id, MAX_ORDERS_SHOWN),
    adminCustomerRepository.spend(row.id),
  ]);

  return {
    id: row.id,
    email: row.email,
    emailVerified: row.email_verified_at !== null,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    language: row.language,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    lastLoginAt: iso(row.last_login_at),
    anonymisedAt: iso(row.anonymised_at),
    activeSessions: row.active_sessions,
    addresses: addresses.map((address) => ({
      id: address.id,
      fullName: address.full_name,
      phone: address.phone,
      country: address.country,
      city: address.city,
      address: address.address,
      zip: address.zip,
      isDefault: address.is_default,
    })),
    spend: spend.map((entry) => ({
      currency: entry.currency,
      orders: entry.orders,
      paid: Number(entry.paid),
      refunded: Number(entry.refunded),
      net: Number(entry.paid) - Number(entry.refunded),
    })),
    orders: orders.map((order) => ({
      number: order.number,
      market: order.market,
      currency: order.currency,
      status: order.status,
      paymentStatus: order.payment_status,
      total: Number(order.total),
      placedAt: new Date(order.placed_at).toISOString(),
    })),
  };
}

export async function getCustomer(id: string): Promise<CustomerDto> {
  const row = await adminCustomerRepository.findById(id);
  if (!row) throw notFound();
  return toDto(row);
}

/**
 * Stops a customer signing in: every browser they are signed in on is signed
 * out at once, and logging in is refused until they are unblocked. Their
 * orders, cart and wishlist are left as they are. The reason goes to the audit log.
 */
export async function blockCustomer(
  ctx: AdminContext,
  id: string,
  reason: string,
): Promise<CustomerDto> {
  await withTransaction(async (tx) => {
    const customer = await adminCustomerRepository.lockById(id, tx);
    if (!customer) throw notFound();
    if (customer.status === "anonymised") {
      throw new ApiError("conflict", {
        message: "This account was deleted by the customer.",
      });
    }
    if (customer.status === "blocked") {
      throw new ApiError("conflict", {
        message: "This customer is already blocked.",
      });
    }

    await adminCustomerRepository.setStatus(id, "blocked", tx);
    await sessionRepository.revokeAllForCustomer(id, new Date(), undefined, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "customers.block",
        entityType: "customer",
        entityId: id,
        before: { status: customer.status },
        after: { status: "blocked", reason },
      },
      ctx.requestId,
    );
  });
  return getCustomer(id);
}

export async function unblockCustomer(
  ctx: AdminContext,
  id: string,
  note: string | null,
): Promise<CustomerDto> {
  await withTransaction(async (tx) => {
    const customer = await adminCustomerRepository.lockById(id, tx);
    if (!customer) throw notFound();
    if (customer.status !== "blocked") {
      throw new ApiError("conflict", {
        message: "This customer is not blocked.",
      });
    }

    await adminCustomerRepository.setStatus(id, "active", tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "customers.unblock",
        entityType: "customer",
        entityId: id,
        before: { status: "blocked" },
        after: { status: "active", note },
      },
      ctx.requestId,
    );
  });
  return getCustomer(id);
}
