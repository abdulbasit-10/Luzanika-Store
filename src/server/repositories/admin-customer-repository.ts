import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export type CustomerStatus = "active" | "blocked" | "anonymised";

export interface CustomerFilter {
  /** Matches email, first or last name, or phone. */
  search?: string;
  status?: CustomerStatus;
}

export interface CustomerListRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: CustomerStatus;
  created_at: Date;
  last_login_at: Date | null;
  order_count: number;
  last_order_at: Date | null;
}

export interface CustomerRow {
  id: string;
  email: string;
  email_verified_at: Date | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  language: string;
  status: CustomerStatus;
  created_at: Date;
  last_login_at: Date | null;
  anonymised_at: Date | null;
  active_sessions: number;
}

export interface CustomerAddressRow {
  id: string;
  full_name: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  zip: string;
  is_default: boolean;
}

export interface CustomerOrderRow {
  number: string;
  market: "PK" | "DE";
  currency: "PKR" | "EUR";
  status: string;
  payment_status: string;
  total: string;
  placed_at: Date;
}

export interface CustomerSpendRow {
  currency: "PKR" | "EUR";
  orders: number;
  paid: string;
  refunded: string;
}

function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

export const adminCustomerRepository = {
  async list(
    filter: CustomerFilter,
    limit: number,
    offset: number,
  ): Promise<{ rows: CustomerListRow[]; total: number }> {
    const replacements = {
      status: filter.status ?? null,
      search: filter.search ?? null,
      pattern: likePattern(filter.search ?? ""),
    };
    const where = `WHERE (CAST(:status AS text) IS NULL OR c.status = :status)
      AND (CAST(:search AS text) IS NULL OR c.email::text ILIKE :pattern
           OR c.first_name ILIKE :pattern OR c.last_name ILIKE :pattern
           OR (c.first_name || ' ' || c.last_name) ILIKE :pattern
           OR c.phone ILIKE :pattern)`;

    const [rows, count] = await Promise.all([
      selectRows<CustomerListRow>(
        `SELECT c.id, c.email::text AS email, c.first_name, c.last_name, c.phone, c.status,
                c.created_at, c.last_login_at,
                (SELECT count(*)::int FROM orders o WHERE o.customer_id = c.id) AS order_count,
                (SELECT max(o.placed_at) FROM orders o WHERE o.customer_id = c.id) AS last_order_at
         FROM customers c ${where}
         ORDER BY c.created_at DESC, c.id LIMIT :limit OFFSET :offset`,
        { ...replacements, limit, offset },
      ),
      selectRows<{ n: number }>(
        `SELECT count(*)::int AS n FROM customers c ${where}`,
        replacements,
      ),
    ]);
    return { rows, total: count[0].n };
  },

  async findById(id: string, tx?: Tx): Promise<CustomerRow | undefined> {
    const rows = await selectRows<CustomerRow>(
      `SELECT c.id, c.email::text AS email, c.email_verified_at, c.first_name, c.last_name, c.phone,
              c.gender, to_char(c.date_of_birth, 'YYYY-MM-DD') AS date_of_birth, c.language, c.status,
              c.created_at, c.last_login_at, c.anonymised_at,
              (SELECT count(*)::int FROM customer_sessions s
                WHERE s.customer_id = c.id AND s.revoked_at IS NULL AND s.expires_at > now()) AS active_sessions
       FROM customers c WHERE c.id = :id`,
      { id },
      tx,
    );
    return rows[0];
  },

  /** Locks the customer row so a block, an unblock and an account deletion cannot overlap. */
  async lockById(id: string, tx: Tx): Promise<CustomerRow | undefined> {
    const rows = await selectRows<CustomerRow>(
      `SELECT c.id, c.email::text AS email, c.email_verified_at, c.first_name, c.last_name, c.phone,
              c.gender, to_char(c.date_of_birth, 'YYYY-MM-DD') AS date_of_birth, c.language, c.status,
              c.created_at, c.last_login_at, c.anonymised_at, 0 AS active_sessions
       FROM customers c WHERE c.id = :id FOR UPDATE OF c`,
      { id },
      tx,
    );
    return rows[0];
  },

  listAddresses(customerId: string, tx?: Tx): Promise<CustomerAddressRow[]> {
    return selectRows<CustomerAddressRow>(
      `SELECT id, full_name, phone, country, city, address, zip, is_default
       FROM addresses WHERE customer_id = :customerId ORDER BY created_at, id`,
      { customerId },
      tx,
    );
  },

  listOrders(
    customerId: string,
    limit: number,
    tx?: Tx,
  ): Promise<CustomerOrderRow[]> {
    return selectRows<CustomerOrderRow>(
      `SELECT number, market, currency, status, payment_status, total, placed_at
       FROM orders WHERE customer_id = :customerId ORDER BY placed_at DESC, id LIMIT :limit`,
      { customerId, limit },
      tx,
    );
  },

  /** What the customer paid and got back, per currency (never added across currencies). */
  spend(customerId: string, tx?: Tx): Promise<CustomerSpendRow[]> {
    return selectRows<CustomerSpendRow>(
      `SELECT o.currency, count(*)::int AS orders,
              COALESCE(sum(o.total) FILTER (WHERE o.paid_at IS NOT NULL), 0) AS paid,
              COALESCE(sum(r.refunded), 0) AS refunded
       FROM orders o
       LEFT JOIN (SELECT order_id, sum(amount) AS refunded FROM refunds GROUP BY order_id) r
         ON r.order_id = o.id
       WHERE o.customer_id = :customerId GROUP BY o.currency ORDER BY o.currency`,
      { customerId },
      tx,
    );
  },

  async setStatus(
    id: string,
    status: "active" | "blocked",
    tx: Tx,
  ): Promise<void> {
    await execute(
      "UPDATE customers SET status = :status WHERE id = :id",
      {
        id,
        status,
      },
      tx,
    );
  },
};
