import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export type Market = "PK" | "DE";
export type Currency = "PKR" | "EUR";
export type OrderStatus =
  | "waiting_payment"
  | "processing"
  | "in_delivery"
  | "completed"
  | "cancelled"
  | "refunded";
export type PaymentStatus =
  "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
export type StockState = "reserved" | "committed" | "released";
export type ActorType = "customer" | "system" | "payment" | "staff";

export interface OrderRow {
  id: string;
  number: string;
  market: Market;
  currency: Currency;
  customer_id: string | null;
  email: string;
  phone: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: "card";
  /** Who collects the money for the newest payment attempt. */
  payment_provider: string | null;
  stock_state: StockState;
  reservation_expires_at: Date | null;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  /** null: no tax worked out. true: the tax is already inside the prices. false: added on top. */
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
  placed_at: Date;
  paid_at: Date | null;
  cancelled_at: Date | null;
  cancel_reason: string | null;
}

export interface OrderItemRow {
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_slug: string;
  name: string;
  sku: string;
  color: string | null;
  size: string | null;
  image_src: string | null;
  image_alt: string | null;
  image_position: string | null;
  quantity: number;
  unit_amount: string;
  line_total: string;
}

export interface NewOrder {
  number: string;
  market: Market;
  currency: Currency;
  customerId: string;
  idempotencyKey: string | null;
  email: string;
  phone: string;
  paymentMethod: "card";
  reservationExpiresAt: Date;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  taxIncluded: boolean | null;
  total: number;
  shipName: string;
  shipCompany: string | null;
  shipCountry: string;
  shipCity: string;
  shipAddress: string;
  shipZip: string;
  bill: { country: string; city: string; address: string; zip: string } | null;
}

export interface NewOrderItem {
  productId: string;
  variantId: string;
  productSlug: string;
  name: string;
  sku: string;
  color: string | null;
  size: string | null;
  imageSrc: string | null;
  imageAlt: string | null;
  imagePosition: string | null;
  quantity: number;
  unitAmount: number;
}

export interface InventoryLock {
  variant_id: string;
  on_hand: number;
  reserved: number;
}

const ORDER_COLUMNS = `o.id, o.number, o.market, o.currency, o.customer_id, o.email, o.phone,
  o.status, o.payment_status, o.payment_method, o.stock_state, o.reservation_expires_at,
  (SELECT p.provider FROM payments p WHERE p.order_id = o.id ORDER BY p.created_at DESC, p.id LIMIT 1) AS payment_provider,
  o.subtotal, o.discount_total, o.shipping_total, o.tax_total, o.tax_included, o.total,
  o.ship_name, o.ship_company, o.ship_country, o.ship_city, o.ship_address, o.ship_zip,
  o.bill_country, o.bill_city, o.bill_address, o.bill_zip,
  o.placed_at, o.paid_at, o.cancelled_at, o.cancel_reason`;

/** Raw SQL for orders. Every method that changes data runs inside the caller's transaction. */
export const orderRepository = {
  /** Takes the next number for the market. The counter row stays locked until the transaction ends. */
  async nextNumber(market: Market, tx: Tx): Promise<string> {
    const rows = await selectRows<{ last_number: string }>(
      `UPDATE order_counters SET last_number = last_number + 1
       WHERE market = :market RETURNING last_number`,
      { market },
      tx,
    );
    return `LZ-${market}-${rows[0].last_number.padStart(6, "0")}`;
  },

  async insert(order: NewOrder, tx: Tx): Promise<string> {
    const rows = await selectRows<{ id: string }>(
      `INSERT INTO orders (number, market, currency, customer_id, idempotency_key, email, phone,
         payment_method, reservation_expires_at, subtotal, discount_total, shipping_total, tax_total,
         tax_included, total, ship_name, ship_company, ship_country, ship_city, ship_address, ship_zip,
         bill_country, bill_city, bill_address, bill_zip, accepted_terms_at)
       VALUES (:number, :market, :currency, :customerId, :idempotencyKey, :email, :phone,
         :paymentMethod, :reservationExpiresAt, :subtotal, :discountTotal, :shippingTotal, :taxTotal,
         :taxIncluded, :total, :shipName, :shipCompany, :shipCountry, :shipCity, :shipAddress, :shipZip,
         :billCountry, :billCity, :billAddress, :billZip, now())
       RETURNING id`,
      {
        ...order,
        billCountry: order.bill?.country ?? null,
        billCity: order.bill?.city ?? null,
        billAddress: order.bill?.address ?? null,
        billZip: order.bill?.zip ?? null,
      },
      tx,
    );
    return rows[0].id;
  },

  async insertItems(
    orderId: string,
    items: NewOrderItem[],
    tx: Tx,
  ): Promise<void> {
    for (const [position, item] of items.entries()) {
      await execute(
        `INSERT INTO order_items (order_id, position, product_id, variant_id, product_slug, name, sku, color,
           size, image_src, image_alt, image_position, quantity, unit_amount, line_total)
         VALUES (:orderId, :position, :productId, :variantId, :productSlug, :name, :sku, :color,
           :size, :imageSrc, :imageAlt, :imagePosition, :quantity, :unitAmount, :lineTotal)`,
        {
          ...item,
          orderId,
          position,
          lineTotal: item.unitAmount * item.quantity,
        },
        tx,
      );
    }
  },

  async addHistory(
    entry: {
      orderId: string;
      from: OrderStatus | null;
      to: OrderStatus;
      actor: ActorType;
      actorId?: string | null;
      note?: string | null;
    },
    tx: Tx,
  ): Promise<void> {
    await execute(
      `INSERT INTO order_status_history (order_id, from_status, to_status, actor_type, actor_id, note)
       VALUES (:orderId, :from, :to, :actor, :actorId, :note)`,
      { ...entry, actorId: entry.actorId ?? null, note: entry.note ?? null },
      tx,
    );
  },

  async insertPayment(
    payment: {
      orderId: string;
      provider: string;
      method: string;
      amount: number;
      currency: Currency;
    },
    tx: Tx,
  ): Promise<void> {
    await execute(
      `INSERT INTO payments (order_id, provider, method, amount, currency)
       VALUES (:orderId, :provider, :method, :amount, :currency)`,
      payment,
      tx,
    );
  },

  /** Sets the provider's id on the newest payment attempt of the order. */
  async setPaymentRef(
    orderId: string,
    providerRef: string,
    tx?: Tx,
  ): Promise<void> {
    await execute(
      `UPDATE payments SET provider_ref = :providerRef
       WHERE id = (SELECT id FROM payments WHERE order_id = :orderId ORDER BY created_at DESC, id LIMIT 1)`,
      { orderId, providerRef },
      tx,
    );
  },

  /** Updates the newest payment attempt that is not finished. */
  async setPaymentStatus(
    orderId: string,
    status: "succeeded" | "failed" | "cancelled",
    tx: Tx,
    failureCode: string | null = null,
  ): Promise<void> {
    await execute(
      `UPDATE payments SET status = :status, failure_code = :failureCode
       WHERE id = (
         SELECT id FROM payments WHERE order_id = :orderId AND status IN ('pending', 'requires_action', 'failed')
         ORDER BY created_at DESC, id LIMIT 1)`,
      { orderId, status, failureCode },
      tx,
    );
  },

  async findByIdempotencyKey(
    customerId: string,
    key: string,
    tx: Tx,
  ): Promise<OrderRow | undefined> {
    const rows = await selectRows<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders o
       WHERE o.customer_id = :customerId AND o.idempotency_key = :key`,
      { customerId, key },
      tx,
    );
    return rows[0];
  },

  async findById(id: string, tx?: Tx): Promise<OrderRow | undefined> {
    const rows = await selectRows<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders o WHERE o.id = :id`,
      { id },
      tx,
    );
    return rows[0];
  },

  /** Another customer's order number is simply not found. */
  async findOwned(
    customerId: string,
    number: string,
    tx?: Tx,
  ): Promise<OrderRow | undefined> {
    const rows = await selectRows<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders o
       WHERE o.customer_id = :customerId AND o.number = :number`,
      { customerId, number },
      tx,
    );
    return rows[0];
  },

  /** Locks the order row, so payments, cancellations and expiry cannot change it at the same time. */
  async lockById(id: string, tx: Tx): Promise<OrderRow | undefined> {
    const rows = await selectRows<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders o WHERE o.id = :id FOR UPDATE OF o`,
      { id },
      tx,
    );
    return rows[0];
  },

  listForCustomer(customerId: string, limit: number): Promise<OrderRow[]> {
    return selectRows<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders o
       WHERE o.customer_id = :customerId
       ORDER BY o.placed_at DESC, o.id LIMIT :limit`,
      { customerId, limit },
    );
  },

  listItems(orderIds: string[], tx?: Tx): Promise<OrderItemRow[]> {
    if (orderIds.length === 0) return Promise.resolve([]);
    return selectRows<OrderItemRow>(
      `SELECT order_id, product_id, variant_id, product_slug, name, sku, color, size,
         image_src, image_alt, image_position, quantity, unit_amount, line_total
       FROM order_items WHERE order_id IN (:orderIds) ORDER BY order_id, position, id`,
      { orderIds },
      tx,
    );
  },

  /** Ids of unpaid orders whose time ran out. Each is then cancelled in its own transaction (see the order service). */
  async findExpiredIds(limit: number): Promise<string[]> {
    const rows = await selectRows<{ id: string }>(
      `SELECT id FROM orders
       WHERE status = 'waiting_payment' AND stock_state = 'reserved' AND reservation_expires_at < now()
       ORDER BY reservation_expires_at LIMIT :limit`,
      { limit },
    );
    return rows.map((row) => row.id);
  },

  async latestPaymentRef(orderId: string): Promise<string | null> {
    const rows = await selectRows<{ provider_ref: string | null }>(
      `SELECT provider_ref FROM payments WHERE order_id = :orderId
       ORDER BY created_at DESC, id LIMIT 1`,
      { orderId },
    );
    return rows[0]?.provider_ref ?? null;
  },

  /** Orders of a customer that are still waiting for payment (their stock is being held). */
  async listOpenIds(customerId: string, tx: Tx): Promise<string[]> {
    const rows = await selectRows<{ id: string }>(
      `SELECT id FROM orders WHERE customer_id = :customerId AND status = 'waiting_payment' ORDER BY id`,
      { customerId },
      tx,
    );
    return rows.map((row) => row.id);
  },

  /** Locks the stock rows of these variants, always in the same order so two orders can never wait on each other. */
  lockInventory(
    variantIds: string[],
    market: Market,
    tx: Tx,
  ): Promise<InventoryLock[]> {
    if (variantIds.length === 0) return Promise.resolve([]);
    return selectRows<InventoryLock>(
      `SELECT variant_id, on_hand, reserved FROM inventory
       WHERE variant_id IN (:variantIds) AND market = :market
       ORDER BY variant_id FOR UPDATE`,
      { variantIds, market },
      tx,
    );
  },

  async reserve(
    variantId: string,
    market: Market,
    quantity: number,
    tx: Tx,
  ): Promise<void> {
    await execute(
      "UPDATE inventory SET reserved = reserved + :quantity WHERE variant_id = :variantId AND market = :market",
      { variantId, market, quantity },
      tx,
    );
  },

  async release(
    variantId: string,
    market: Market,
    quantity: number,
    tx: Tx,
  ): Promise<void> {
    await execute(
      "UPDATE inventory SET reserved = reserved - :quantity WHERE variant_id = :variantId AND market = :market",
      { variantId, market, quantity },
      tx,
    );
  },

  /** Turns held stock into a sale: it leaves the shelf (on hand) and is no longer just held (reserved). */
  async sell(
    variantId: string,
    market: Market,
    quantity: number,
    wasReserved: boolean,
    orderId: string,
    tx: Tx,
  ): Promise<void> {
    await execute(
      `UPDATE inventory SET on_hand = on_hand - :quantity,
         reserved = reserved - CASE WHEN :wasReserved THEN :quantity ELSE 0 END
       WHERE variant_id = :variantId AND market = :market`,
      { variantId, market, quantity, wasReserved },
      tx,
    );
    await execute(
      `INSERT INTO stock_movements (variant_id, market, delta, reason, note, order_id)
       VALUES (:variantId, :market, :delta, 'sale', 'Order paid', :orderId)`,
      { variantId, market, delta: -quantity, orderId },
      tx,
    );
  },

  /** Changes the status columns of an order. Only the fields given are touched. */
  async update(
    id: string,
    changes: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      stockState?: StockState;
      clearReservation?: boolean;
      paid?: boolean;
      cancel?: { reason: string } | "clear";
    },
    tx: Tx,
  ): Promise<void> {
    await execute(
      `UPDATE orders SET
         status = COALESCE(:status, status),
         payment_status = COALESCE(:paymentStatus, payment_status),
         stock_state = COALESCE(:stockState, stock_state),
         reservation_expires_at = CASE WHEN :clearReservation THEN NULL ELSE reservation_expires_at END,
         paid_at = CASE WHEN :paid THEN now() ELSE paid_at END,
         cancelled_at = CASE WHEN :cancelReason IS NOT NULL THEN now() WHEN :cancelClear THEN NULL ELSE cancelled_at END,
         cancel_reason = CASE WHEN :cancelReason IS NOT NULL THEN CAST(:cancelReason AS text) WHEN :cancelClear THEN NULL ELSE cancel_reason END
       WHERE id = :id`,
      {
        id,
        status: changes.status ?? null,
        paymentStatus: changes.paymentStatus ?? null,
        stockState: changes.stockState ?? null,
        clearReservation: changes.clearReservation ?? false,
        paid: changes.paid ?? false,
        cancelReason:
          changes.cancel && changes.cancel !== "clear"
            ? changes.cancel.reason
            : null,
        cancelClear: changes.cancel === "clear",
      },
      tx,
    );
  },
};
