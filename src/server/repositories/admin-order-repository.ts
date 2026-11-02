import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";
import type {
  Currency,
  Market,
  OrderStatus,
  PaymentStatus,
  StockState,
} from "@/server/repositories/order-repository";

export interface AdminOrderFilter {
  market?: Market;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  /** Placed on or after this moment. */
  from?: Date;
  /** Placed before this moment. */
  to?: Date;
  /** Matches the order number, the email or the recipient's name. */
  search?: string;
}

export interface AdminOrderListRow {
  number: string;
  market: Market;
  currency: Currency;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total: string;
  email: string;
  ship_name: string;
  customer_id: string | null;
  placed_at: Date;
  paid_at: Date | null;
  item_count: number;
  refunded_total: string;
}

export interface AdminOrderRow {
  id: string;
  number: string;
  market: Market;
  currency: Currency;
  customer_id: string | null;
  email: string;
  phone: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  stock_state: StockState;
  reservation_expires_at: Date | null;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  tax_included: boolean | null;
  total: string;
  ship_name: string;
  ship_company: string | null;
  ship_country: string;
  ship_city: string;
  ship_address: string;
  ship_zip: string;
  bill_country: string | null;
  bill_city: string | null;
  bill_address: string | null;
  bill_zip: string | null;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: Date | null;
  completed_at: Date | null;
  placed_at: Date;
  paid_at: Date | null;
  cancelled_at: Date | null;
  cancel_reason: string | null;
}

export interface AdminOrderItemRow {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  product_slug: string;
  name: string;
  sku: string;
  color: string | null;
  size: string | null;
  image_src: string | null;
  image_alt: string | null;
  quantity: number;
  unit_amount: string;
  line_total: string;
  /** How many of this line came back with refunds that restocked them. */
  restocked_quantity: number;
}

export interface AdminPaymentRow {
  provider: string;
  provider_ref: string | null;
  method: string;
  amount: string;
  currency: Currency;
  status: string;
  failure_code: string | null;
  created_at: Date;
}

export interface AdminHistoryRow {
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  note: string | null;
  at: Date;
}

export interface AdminRefundRow {
  id: string;
  amount: string;
  currency: Currency;
  reason: string;
  restock: boolean;
  created_at: Date;
  staff_id: string | null;
  staff_name: string | null;
  staff_email: string | null;
}

export interface AdminRefundItemRow {
  refund_id: string;
  order_item_id: string;
  quantity: number;
}

/** Escapes % and _ so a search for "50%" is not a wildcard. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

const ORDER_COLUMNS = `o.id, o.number, o.market, o.currency, o.customer_id, o.email, o.phone, o.status,
  o.payment_status, o.payment_method, o.stock_state, o.reservation_expires_at,
  o.subtotal, o.discount_total, o.shipping_total, o.tax_total, o.tax_included, o.total,
  o.ship_name, o.ship_company, o.ship_country, o.ship_city, o.ship_address, o.ship_zip,
  o.bill_country, o.bill_city, o.bill_address, o.bill_zip,
  o.carrier, o.tracking_number, o.shipped_at, o.completed_at,
  o.placed_at, o.paid_at, o.cancelled_at, o.cancel_reason`;

export const adminOrderRepository = {
  async list(
    filter: AdminOrderFilter,
    limit: number,
    offset: number,
  ): Promise<{ rows: AdminOrderListRow[]; total: number }> {
    const replacements = {
      market: filter.market ?? null,
      status: filter.status ?? null,
      paymentStatus: filter.paymentStatus ?? null,
      from: filter.from ?? null,
      to: filter.to ?? null,
      search: filter.search ?? null,
      pattern: likePattern(filter.search ?? ""),
      limit,
      offset,
    };
    const where = `WHERE (CAST(:market AS text) IS NULL OR o.market = :market)
        AND (CAST(:status AS text) IS NULL OR o.status = :status)
        AND (CAST(:paymentStatus AS text) IS NULL OR o.payment_status = :paymentStatus)
        AND (CAST(:from AS timestamptz) IS NULL OR o.placed_at >= CAST(:from AS timestamptz))
        AND (CAST(:to AS timestamptz) IS NULL OR o.placed_at < CAST(:to AS timestamptz))
        AND (CAST(:search AS text) IS NULL
             OR o.number ILIKE :pattern OR o.email ILIKE :pattern OR o.ship_name ILIKE :pattern)`;

    const [rows, count] = await Promise.all([
      selectRows<AdminOrderListRow>(
        `SELECT o.number, o.market, o.currency, o.status, o.payment_status, o.total, o.email,
                o.ship_name, o.customer_id, o.placed_at, o.paid_at,
                (SELECT COALESCE(sum(i.quantity), 0)::int FROM order_items i WHERE i.order_id = o.id) AS item_count,
                COALESCE((SELECT sum(r.amount) FROM refunds r WHERE r.order_id = o.id), 0) AS refunded_total
         FROM orders o ${where}
         ORDER BY o.placed_at DESC, o.id LIMIT :limit OFFSET :offset`,
        replacements,
      ),
      selectRows<{ n: number }>(
        `SELECT count(*)::int AS n FROM orders o ${where}`,
        replacements,
      ),
    ]);
    return { rows, total: count[0].n };
  },

  async findByNumber(
    number: string,
    tx?: Tx,
  ): Promise<AdminOrderRow | undefined> {
    const rows = await selectRows<AdminOrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders o WHERE o.number = :number`,
      { number },
      tx,
    );
    return rows[0];
  },

  /** Locks the order row so a status change, a refund and a payment cannot overlap. */
  async lockByNumber(
    number: string,
    tx: Tx,
  ): Promise<AdminOrderRow | undefined> {
    const rows = await selectRows<AdminOrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders o WHERE o.number = :number FOR UPDATE OF o`,
      { number },
      tx,
    );
    return rows[0];
  },

  listItems(orderId: string, tx?: Tx): Promise<AdminOrderItemRow[]> {
    return selectRows<AdminOrderItemRow>(
      `SELECT i.id, i.product_id, i.variant_id, i.product_slug, i.name, i.sku, i.color, i.size,
              i.image_src, i.image_alt, i.quantity, i.unit_amount, i.line_total,
              COALESCE((SELECT sum(ri.quantity) FROM refund_items ri WHERE ri.order_item_id = i.id), 0)::int
                AS restocked_quantity
       FROM order_items i WHERE i.order_id = :orderId ORDER BY i.position, i.id`,
      { orderId },
      tx,
    );
  },

  listPayments(orderId: string, tx?: Tx): Promise<AdminPaymentRow[]> {
    return selectRows<AdminPaymentRow>(
      `SELECT provider, provider_ref, method, amount, currency, status, failure_code, created_at
       FROM payments WHERE order_id = :orderId ORDER BY created_at, id`,
      { orderId },
      tx,
    );
  },

  listHistory(orderId: string, tx?: Tx): Promise<AdminHistoryRow[]> {
    return selectRows<AdminHistoryRow>(
      `SELECT h.from_status, h.to_status, h.actor_type, h.actor_id, h.note, h.at,
              CASE WHEN s.id IS NULL THEN NULL ELSE s.first_name || ' ' || s.last_name END AS actor_name,
              s.email::text AS actor_email
       FROM order_status_history h
       LEFT JOIN staff s ON h.actor_type = 'staff' AND s.id = h.actor_id
       WHERE h.order_id = :orderId ORDER BY h.at, h.id`,
      { orderId },
      tx,
    );
  },

  listRefunds(orderId: string, tx?: Tx): Promise<AdminRefundRow[]> {
    return selectRows<AdminRefundRow>(
      `SELECT r.id, r.amount, r.currency, r.reason, r.restock, r.created_at, r.staff_id,
              CASE WHEN s.id IS NULL THEN NULL ELSE s.first_name || ' ' || s.last_name END AS staff_name,
              s.email::text AS staff_email
       FROM refunds r LEFT JOIN staff s ON s.id = r.staff_id
       WHERE r.order_id = :orderId ORDER BY r.created_at, r.id`,
      { orderId },
      tx,
    );
  },

  listRefundItems(orderId: string, tx?: Tx): Promise<AdminRefundItemRow[]> {
    return selectRows<AdminRefundItemRow>(
      `SELECT ri.refund_id, ri.order_item_id, ri.quantity FROM refund_items ri
       JOIN refunds r ON r.id = ri.refund_id WHERE r.order_id = :orderId`,
      { orderId },
      tx,
    );
  },

  /** Adds a refund record and returns its id. */
  async insertRefund(
    refund: {
      orderId: string;
      staffId: string;
      amount: number;
      currency: Currency;
      reason: string;
      restock: boolean;
    },
    tx: Tx,
  ): Promise<string> {
    const rows = await selectRows<{ id: string }>(
      `INSERT INTO refunds (order_id, staff_id, amount, currency, reason, restock)
       VALUES (:orderId, :staffId, :amount, :currency, :reason, :restock) RETURNING id`,
      refund,
      tx,
    );
    return rows[0].id;
  },

  async insertRefundItem(
    refundId: string,
    orderItemId: string,
    quantity: number,
    tx: Tx,
  ): Promise<void> {
    await execute(
      "INSERT INTO refund_items (refund_id, order_item_id, quantity) VALUES (:refundId, :orderItemId, :quantity)",
      { refundId, orderItemId, quantity },
      tx,
    );
  },

  /**
   * Puts returned units back on the shelf and writes the stock ledger row,
   * naming the person. The inventory row is created if the variant never had
   * one in this market. Callers lock the rows first, in variant order.
   */
  async restock(
    input: {
      variantId: string;
      market: Market;
      quantity: number;
      orderId: string;
      staffId: string;
      note: string;
    },
    tx: Tx,
  ): Promise<void> {
    await execute(
      `INSERT INTO inventory (variant_id, market, on_hand) VALUES (:variantId, :market, :quantity)
       ON CONFLICT (variant_id, market) DO UPDATE SET on_hand = inventory.on_hand + EXCLUDED.on_hand`,
      input,
      tx,
    );
    await execute(
      `INSERT INTO stock_movements (variant_id, market, delta, reason, note, order_id, staff_id)
       VALUES (:variantId, :market, :quantity, 'return', :note, :orderId, :staffId)`,
      input,
      tx,
    );
  },

  /** Updates an order after a refund: its payment status, and its status and stock state when they change. */
  async applyRefundState(
    orderId: string,
    next: {
      status?: "refunded";
      paymentStatus: "refunded" | "partially_refunded";
      stockState?: "released";
    },
    tx: Tx,
  ): Promise<void> {
    await execute(
      `UPDATE orders SET
         status = COALESCE(:status, status),
         payment_status = :paymentStatus,
         stock_state = COALESCE(:stockState, stock_state)
       WHERE id = :orderId`,
      {
        orderId,
        status: next.status ?? null,
        paymentStatus: next.paymentStatus,
        stockState: next.stockState ?? null,
      },
      tx,
    );
  },

  /** Sets the delivery details; they are given together. */
  async setDelivery(
    orderId: string,
    delivery: { carrier: string; trackingNumber: string },
    tx: Tx,
  ): Promise<void> {
    await execute(
      "UPDATE orders SET carrier = :carrier, tracking_number = :trackingNumber WHERE id = :orderId",
      { orderId, ...delivery },
      tx,
    );
  },

  /** Moves a paid order along: in delivery (with the moment it shipped) or completed. */
  async setProgress(
    orderId: string,
    status: "in_delivery" | "completed",
    tx: Tx,
  ): Promise<void> {
    await execute(
      `UPDATE orders SET status = :status,
         shipped_at = CASE WHEN :status = 'in_delivery' THEN now() ELSE shipped_at END,
         completed_at = CASE WHEN :status = 'completed' THEN now() ELSE completed_at END
       WHERE id = :orderId`,
      { orderId, status },
      tx,
    );
  },
};
