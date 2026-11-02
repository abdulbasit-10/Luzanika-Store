import "server-only";

import { recordAudit } from "@/server/audit/audit";
import { refreshCatalogCache } from "@/server/catalog/refresh-cache";
import { withTransaction, type Tx } from "@/server/db/transaction";
import { getEmailSender, type EmailMessage } from "@/server/email/email-sender";
import {
  orderCancelledEmail,
  orderCompletedEmail,
  orderShippedEmail,
} from "@/server/email/templates";
import { ApiError } from "@/server/http/api-error";
import { logger, serializeError } from "@/server/logger";
import {
  canStaffMove,
  nextStaffStatuses,
  type StaffTargetStatus,
} from "@/server/orders/order-flow";
import {
  adminOrderRepository,
  type AdminOrderFilter,
  type AdminOrderRow,
} from "@/server/repositories/admin-order-repository";
import {
  orderRepository,
  type Currency,
  type Market,
  type OrderStatus,
  type PaymentStatus,
} from "@/server/repositories/order-repository";
import type { AdminContext } from "@/server/services/staff-admin-service";
import { cancelUnpaid } from "@/server/services/order-service";
import { planRefund, RefundRuleError } from "@/server/orders/refund-rules";
import { orderNumberSchema } from "@/server/validation/order-schemas";
import type {
  ChangeOrderStatusBody,
  CreateRefundBody,
} from "@/server/validation/admin-order-schemas";

const iso = (value: Date | null) =>
  value === null ? null : new Date(value).toISOString();

export interface AdminOrderListItemDto {
  number: string;
  market: Market;
  currency: Currency;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** Minor units. */
  total: number;
  refundedTotal: number;
  itemCount: number;
  customerEmail: string;
  recipientName: string;
  customerId: string | null;
  placedAt: string;
  paidAt: string | null;
}

export interface AdminOrderDto {
  number: string;
  market: Market;
  currency: Currency;
  status: OrderStatus;
  /** The moves the admin may offer for this order right now. */
  allowedNextStatuses: StaffTargetStatus[];
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  stockState: string;
  placedAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  reservationExpiresAt: string | null;
  customerId: string | null;
  contact: { email: string; phone: string };
  /** Minor units. */
  amounts: {
    subtotal: number;
    discountTotal: number;
    shippingTotal: number;
    taxTotal: number;
    taxIncluded: boolean | null;
    total: number;
    refundedTotal: number;
    /** What can still be refunded (0 until the order is paid). */
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
    /** How many of this line were put back into stock by refunds. */
    restockedQuantity: number;
  }[];
  payments: {
    provider: string;
    providerRef: string | null;
    method: string;
    amount: number;
    currency: Currency;
    status: string;
    failureCode: string | null;
    createdAt: string;
  }[];
  history: {
    from: OrderStatus | null;
    to: OrderStatus;
    actorType: string;
    actor: { id: string; name: string; email: string } | null;
    note: string | null;
    at: string;
  }[];
  refunds: {
    id: string;
    amount: number;
    currency: Currency;
    reason: string;
    restock: boolean;
    items: { orderItemId: string; quantity: number }[];
    by: { id: string; name: string; email: string } | null;
    createdAt: string;
  }[];
}

const notFound = () => new ApiError("not_found");

export function parseOrderNumber(raw: string): string {
  const parsed = orderNumberSchema.safeParse(raw);
  if (!parsed.success) throw notFound();
  return parsed.data;
}

export async function listAdminOrders(
  filter: AdminOrderFilter,
  page: number,
  pageSize: number,
): Promise<{
  items: AdminOrderListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { rows, total } = await adminOrderRepository.list(
    filter,
    pageSize,
    (page - 1) * pageSize,
  );
  return {
    items: rows.map((row) => ({
      number: row.number,
      market: row.market,
      currency: row.currency,
      status: row.status,
      paymentStatus: row.payment_status,
      total: Number(row.total),
      refundedTotal: Number(row.refunded_total),
      itemCount: row.item_count,
      customerEmail: row.email,
      recipientName: row.ship_name,
      customerId: row.customer_id,
      placedAt: new Date(row.placed_at).toISOString(),
      paidAt: iso(row.paid_at),
    })),
    total,
    page,
    pageSize,
  };
}

/** Whether money was taken for the order, so a refund is possible. */
export function isPaid(order: Pick<AdminOrderRow, "payment_status">): boolean {
  return (
    order.payment_status === "paid" ||
    order.payment_status === "partially_refunded"
  );
}

/** Builds the full order page for the admin from the database. */
export async function loadAdminOrder(
  row: AdminOrderRow,
  tx?: Tx,
): Promise<AdminOrderDto> {
  const [items, payments, history, refunds, refundItems] = await Promise.all([
    adminOrderRepository.listItems(row.id, tx),
    adminOrderRepository.listPayments(row.id, tx),
    adminOrderRepository.listHistory(row.id, tx),
    adminOrderRepository.listRefunds(row.id, tx),
    adminOrderRepository.listRefundItems(row.id, tx),
  ]);

  const refundedTotal = refunds.reduce(
    (sum, refund) => sum + Number(refund.amount),
    0,
  );
  const total = Number(row.total);

  return {
    number: row.number,
    market: row.market,
    currency: row.currency,
    status: row.status,
    allowedNextStatuses: nextStaffStatuses(row.status),
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    stockState: row.stock_state,
    placedAt: new Date(row.placed_at).toISOString(),
    paidAt: iso(row.paid_at),
    cancelledAt: iso(row.cancelled_at),
    cancelReason: row.cancel_reason,
    shippedAt: iso(row.shipped_at),
    completedAt: iso(row.completed_at),
    reservationExpiresAt:
      row.status === "waiting_payment" ? iso(row.reservation_expires_at) : null,
    customerId: row.customer_id,
    contact: { email: row.email, phone: row.phone },
    amounts: {
      subtotal: Number(row.subtotal),
      discountTotal: Number(row.discount_total),
      shippingTotal: Number(row.shipping_total),
      taxTotal: Number(row.tax_total),
      taxIncluded: row.tax_included,
      total,
      refundedTotal,
      refundableTotal: isPaid(row) ? Math.max(0, total - refundedTotal) : 0,
    },
    shipping: {
      name: row.ship_name,
      ...(row.ship_company ? { company: row.ship_company } : {}),
      country: row.ship_country,
      city: row.ship_city,
      address: row.ship_address,
      zip: row.ship_zip,
    },
    billing:
      row.bill_country !== null &&
      row.bill_city !== null &&
      row.bill_address !== null &&
      row.bill_zip !== null
        ? {
            country: row.bill_country,
            city: row.bill_city,
            address: row.bill_address,
            zip: row.bill_zip,
          }
        : null,
    delivery:
      row.carrier !== null && row.tracking_number !== null
        ? { carrier: row.carrier, trackingNumber: row.tracking_number }
        : null,
    items: items.map((item) => ({
      id: item.id,
      slug: item.product_slug,
      name: item.name,
      sku: item.sku,
      ...(item.color ? { color: item.color } : {}),
      ...(item.size ? { size: item.size } : {}),
      ...(item.image_src
        ? { image: { src: item.image_src, alt: item.image_alt ?? "" } }
        : {}),
      quantity: item.quantity,
      unitAmount: Number(item.unit_amount),
      lineTotal: Number(item.line_total),
      restockedQuantity: item.restocked_quantity,
    })),
    payments: payments.map((payment) => ({
      provider: payment.provider,
      providerRef: payment.provider_ref,
      method: payment.method,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      failureCode: payment.failure_code,
      createdAt: new Date(payment.created_at).toISOString(),
    })),
    history: history.map((entry) => ({
      from: entry.from_status,
      to: entry.to_status,
      actorType: entry.actor_type,
      actor:
        entry.actor_id && entry.actor_name && entry.actor_email
          ? {
              id: entry.actor_id,
              name: entry.actor_name,
              email: entry.actor_email,
            }
          : null,
      note: entry.note,
      at: new Date(entry.at).toISOString(),
    })),
    refunds: refunds.map((refund) => ({
      id: refund.id,
      amount: Number(refund.amount),
      currency: refund.currency,
      reason: refund.reason,
      restock: refund.restock,
      items: refundItems
        .filter((item) => item.refund_id === refund.id)
        .map((item) => ({
          orderItemId: item.order_item_id,
          quantity: item.quantity,
        })),
      by:
        refund.staff_id && refund.staff_name && refund.staff_email
          ? {
              id: refund.staff_id,
              name: refund.staff_name,
              email: refund.staff_email,
            }
          : null,
      createdAt: new Date(refund.created_at).toISOString(),
    })),
  };
}

export async function getAdminOrder(rawNumber: string): Promise<AdminOrderDto> {
  const row = await adminOrderRepository.findByNumber(
    parseOrderNumber(rawNumber),
  );
  if (!row) throw notFound();
  return loadAdminOrder(row);
}

/** Emails the customer. A failure is logged and never undoes what staff did: the order is already updated. */
export async function notifyCustomer(message: EmailMessage): Promise<void> {
  try {
    await getEmailSender().send(message);
  } catch (error) {
    logger.error("order email failed", { error: serializeError(error) });
  }
}

const badMove = (from: OrderStatus, to: StaffTargetStatus) =>
  new ApiError("invalid_status_transition", {
    message:
      to === "cancelled"
        ? from === "cancelled"
          ? "This order is already cancelled."
          : "Only an unpaid order can be cancelled. Refund a paid order instead."
        : `An order that is "${from.replace("_", " ")}" cannot be moved to "${to.replace("_", " ")}".`,
  });

/**
 * Moves an order along: in delivery (needs carrier and tracking number),
 * completed, or cancelled (unpaid orders only). The customer is emailed.
 * Every move is recorded in the order's history and in the audit log.
 */
export async function changeOrderStatus(
  ctx: AdminContext,
  rawNumber: string,
  body: ChangeOrderStatusBody,
): Promise<AdminOrderDto> {
  const number = parseOrderNumber(rawNumber);
  const current = await adminOrderRepository.findByNumber(number);
  if (!current) throw notFound();
  if (!canStaffMove(current.status, body.status)) {
    throw badMove(current.status, body.status);
  }

  let email: EmailMessage | null = null;

  if (body.status === "cancelled") {
    const reason = body.reason ?? "Cancelled by staff";
    const done = await cancelUnpaid(
      current.id,
      "staff",
      reason,
      ctx.actor.id,
      (tx) =>
        recordAuditFor(ctx, tx, number, current.status, "cancelled", {
          reason,
        }),
    );
    // Someone paid or cancelled it in the meantime.
    if (!done) {
      const latest = (await adminOrderRepository.findByNumber(number))!;
      throw badMove(latest.status, "cancelled");
    }
    email = orderCancelledEmail({
      to: current.email,
      name: current.ship_name,
      orderNumber: number,
      reason: body.reason ?? null,
    });
  } else {
    await withTransaction(async (tx) => {
      const locked = await adminOrderRepository.lockByNumber(number, tx);
      if (!locked) throw notFound();
      if (!canStaffMove(locked.status, body.status)) {
        throw badMove(locked.status, body.status);
      }

      if (body.status === "in_delivery") {
        await adminOrderRepository.setDelivery(
          locked.id,
          { carrier: body.carrier, trackingNumber: body.trackingNumber },
          tx,
        );
      }
      await adminOrderRepository.setProgress(locked.id, body.status, tx);
      await orderRepository.addHistory(
        {
          orderId: locked.id,
          from: locked.status,
          to: body.status,
          actor: "staff",
          actorId: ctx.actor.id,
          note:
            body.status === "in_delivery"
              ? `${body.carrier}: ${body.trackingNumber}`
              : null,
        },
        tx,
      );
      await recordAuditFor(
        ctx,
        tx,
        number,
        locked.status,
        body.status,
        body.status === "in_delivery"
          ? { carrier: body.carrier, trackingNumber: body.trackingNumber }
          : {},
      );
    });

    email =
      body.status === "in_delivery"
        ? orderShippedEmail({
            to: current.email,
            name: current.ship_name,
            orderNumber: number,
            carrier: body.carrier,
            trackingNumber: body.trackingNumber,
          })
        : orderCompletedEmail({
            to: current.email,
            name: current.ship_name,
            orderNumber: number,
          });
  }

  if (email) await notifyCustomer(email);
  return getAdminOrder(number);
}

async function recordAuditFor(
  ctx: AdminContext,
  tx: Tx,
  number: string,
  from: OrderStatus,
  to: OrderStatus,
  details: Record<string, unknown>,
): Promise<void> {
  await recordAudit(
    tx,
    ctx.actor,
    {
      action: "orders.status_change",
      entityType: "order",
      entityId: number,
      before: { status: from },
      after: { status: to, ...details },
    },
    ctx.requestId,
  );
}

/** Corrects the carrier or tracking number of an order that is already on its way. The customer is not emailed again. */
export async function updateDelivery(
  ctx: AdminContext,
  rawNumber: string,
  delivery: { carrier: string; trackingNumber: string },
): Promise<AdminOrderDto> {
  const number = parseOrderNumber(rawNumber);

  await withTransaction(async (tx) => {
    const locked = await adminOrderRepository.lockByNumber(number, tx);
    if (!locked) throw notFound();
    if (locked.status !== "in_delivery") {
      throw new ApiError("conflict", {
        message:
          "Delivery details can only be changed while the order is in delivery.",
      });
    }
    await adminOrderRepository.setDelivery(locked.id, delivery, tx);
    await orderRepository.addHistory(
      {
        orderId: locked.id,
        from: "in_delivery",
        to: "in_delivery",
        actor: "staff",
        actorId: ctx.actor.id,
        note: `Delivery details changed: ${delivery.carrier}: ${delivery.trackingNumber}`,
      },
      tx,
    );
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "orders.delivery_update",
        entityType: "order",
        entityId: number,
        before: {
          carrier: locked.carrier,
          trackingNumber: locked.tracking_number,
        },
        after: delivery,
      },
      ctx.requestId,
    );
  });

  return getAdminOrder(number);
}

/** Shows an amount of minor units as "25.00 PKR" for notes people read. */
function money(amount: number, currency: Currency): string {
  return `${(amount / 100).toFixed(2)} ${currency}`;
}

/**
 * Records a refund against a paid order: a full or partial amount, a reason,
 * and optionally the returned items going back into stock. No money moves yet
 * (there is no payment provider); this is the record, and it sets the order's
 * refund status. A full refund ends the order as "refunded" - this is also how
 * a paid order is cancelled. The order is locked, so two refunds at once can
 * never give back more than was paid.
 */
export async function refundOrder(
  ctx: AdminContext,
  rawNumber: string,
  body: CreateRefundBody,
): Promise<AdminOrderDto> {
  const number = parseOrderNumber(rawNumber);
  let restocked = false;

  await withTransaction(async (tx) => {
    const order = await adminOrderRepository.lockByNumber(number, tx);
    if (!order) throw notFound();

    const [items, refunds] = await Promise.all([
      adminOrderRepository.listItems(order.id, tx),
      adminOrderRepository.listRefunds(order.id, tx),
    ]);
    const refundedTotal = refunds.reduce(
      (sum, refund) => sum + Number(refund.amount),
      0,
    );

    let plan: ReturnType<typeof planRefund>;
    try {
      plan = planRefund(
        {
          status: order.status,
          paymentStatus: order.payment_status,
          total: Number(order.total),
          refundedTotal,
          items: items.map((item) => ({
            id: item.id,
            variantId: item.variant_id,
            quantity: item.quantity,
            restockedQuantity: item.restocked_quantity,
          })),
        },
        body,
      );
    } catch (error) {
      if (error instanceof RefundRuleError) {
        throw error.field
          ? new ApiError("validation_failed", {
              message: error.message,
              fields: { [error.field]: error.message },
            })
          : new ApiError("conflict", { message: error.message });
      }
      throw error;
    }

    const refundId = await adminOrderRepository.insertRefund(
      {
        orderId: order.id,
        staffId: ctx.actor.id,
        amount: plan.amount,
        currency: order.currency,
        reason: body.reason,
        restock: body.restock,
      },
      tx,
    );

    if (plan.restock.length > 0) {
      restocked = true;
      // Always in variant order, like the order code, so two jobs never wait on each other.
      const lines = [...plan.restock].sort((a, b) =>
        a.variantId.localeCompare(b.variantId),
      );
      await orderRepository.lockInventory(
        [...new Set(lines.map((line) => line.variantId))],
        order.market,
        tx,
      );
      for (const line of lines) {
        await adminOrderRepository.insertRefundItem(
          refundId,
          line.orderItemId,
          line.quantity,
          tx,
        );
        await adminOrderRepository.restock(
          {
            variantId: line.variantId,
            market: order.market,
            quantity: line.quantity,
            orderId: order.id,
            staffId: ctx.actor.id,
            note: `Returned: refund of order ${number}`,
          },
          tx,
        );
      }
    }

    await adminOrderRepository.applyRefundState(order.id, plan.next, tx);

    const toStatus = plan.next.status ?? order.status;
    await orderRepository.addHistory(
      {
        orderId: order.id,
        from: order.status,
        to: toStatus,
        actor: "staff",
        actorId: ctx.actor.id,
        note: `${plan.fullyRefunded ? "Full" : "Partial"} refund of ${money(plan.amount, order.currency)}: ${body.reason}`,
      },
      tx,
    );

    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "orders.refund",
        entityType: "order",
        entityId: number,
        before: {
          status: order.status,
          paymentStatus: order.payment_status,
          refundedTotal,
        },
        after: {
          status: toStatus,
          paymentStatus: plan.next.paymentStatus,
          refundedTotal: plan.refundedTotal,
          refund: {
            id: refundId,
            amount: plan.amount,
            currency: order.currency,
            reason: body.reason,
            restock: body.restock,
            items: plan.restock.map((line) => ({
              orderItemId: line.orderItemId,
              quantity: line.quantity,
            })),
          },
        },
      },
      ctx.requestId,
    );
  });

  // Items back on the shelf: the shop pages show the new stock at once.
  if (restocked) refreshCatalogCache();

  return getAdminOrder(number);
}
