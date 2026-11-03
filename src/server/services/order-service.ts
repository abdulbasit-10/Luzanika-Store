import "server-only";

import { toCartLine } from "@/server/cart/cart-lines";
import { withTransaction, type Tx } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import { logger, serializeError } from "@/server/logger";
import { calculateTotals } from "@/server/orders/order-totals";
import { toOrderDto, type OrderDto } from "@/server/orders/order-dto";
import {
  allowedInMarket,
  isOfflineMethod,
  isTransferMethod,
  type PaymentMethod,
} from "@/server/payments/methods";
import {
  getPaymentProvider,
  type PaymentProvider,
} from "@/server/payments/provider";
import { adminOrderRepository } from "@/server/repositories/admin-order-repository";
import { cartRepository } from "@/server/repositories/cart-repository";
import type { CustomerRecord } from "@/server/repositories/customer-repository";
import {
  orderRepository,
  type ActorType,
  type NewOrderItem,
  type OrderRow,
} from "@/server/repositories/order-repository";
import {
  getPaymentSettings,
  getPricingConfig,
  getReservationMinutes,
} from "@/server/services/settings-service";
import {
  orderNumberSchema,
  type CreateOrderBody,
} from "@/server/validation/order-schemas";

export const MAX_ORDERS_LISTED = 50;

export interface PlacedOrder {
  order: OrderDto;
  /** "manual": cash on delivery or a transfer; the customer pays outside the shop. */
  payment: {
    provider: PaymentProvider["name"] | "manual";
    clientSecret?: string;
  };
}

const notFound = () => new ApiError("not_found");

async function toDto(row: OrderRow, tx?: Tx): Promise<OrderDto> {
  const [items, proofs] = await Promise.all([
    orderRepository.listItems([row.id], tx),
    orderRepository.listLatestProofs([row.id], tx),
  ]);
  return toOrderDto(row, items, proofs);
}

/** A method that cannot be used: not for this market, or its payment details are not set up yet. */
async function assertMethodAvailable(
  method: PaymentMethod,
  market: "PK" | "DE",
  tx: Tx,
): Promise<void> {
  if (!allowedInMarket(method, market)) {
    throw new ApiError("validation_failed", {
      message: "That payment method is not available in your country.",
      fields: { paymentMethod: "Please choose another payment method." },
    });
  }
  if (!isTransferMethod(method)) return;

  const { details } = await getPaymentSettings(tx);
  const key = method === "bank_transfer" ? "bank" : method;
  if (!details[key]) {
    throw new ApiError("validation_failed", {
      message: "That payment method is not available right now.",
      fields: { paymentMethod: "Please choose another payment method." },
    });
  }
}

/*
 * How stock moves, in one place:
 *   placing an order      reserved += qty             (held for 30 minutes)
 *   paid                  on_hand -= qty, reserved -= qty   (+ a "sale" ledger row)
 *   cancelled / expired   reserved -= qty             (given back)
 * Stock rows are always locked in variant order, one order per transaction, so
 * two orders can never wait on each other, and the last unit goes to one buyer.
 */

/** Gives back the stock an unpaid order is holding and marks it cancelled. The order must already be locked. */
async function cancelLocked(
  order: OrderRow,
  tx: Tx,
  actor: ActorType,
  reason: string,
  actorId: string | null = null,
): Promise<void> {
  const items = await orderRepository.listItems([order.id], tx);
  const variantIds = items.flatMap((item) =>
    item.variant_id ? [item.variant_id] : [],
  );
  await orderRepository.lockInventory(variantIds, order.market, tx);
  for (const item of items) {
    if (item.variant_id) {
      await orderRepository.release(
        item.variant_id,
        order.market,
        item.quantity,
        tx,
      );
    }
  }

  await orderRepository.update(
    order.id,
    {
      status: "cancelled",
      stockState: "released",
      clearReservation: true,
      cancel: { reason },
    },
    tx,
  );
  await orderRepository.setPaymentStatus(order.id, "cancelled", tx);
  await orderRepository.addHistory(
    {
      orderId: order.id,
      from: "waiting_payment",
      to: "cancelled",
      actor,
      actorId,
      note: reason,
    },
    tx,
  );
}

/** Tells the provider to stop taking payment for a cancelled order. Never blocks or fails the cancellation. */
async function stopPayment(orderId: string): Promise<void> {
  try {
    const ref = await orderRepository.latestPaymentRef(orderId);
    if (ref) await getPaymentProvider().cancel(ref);
  } catch (error) {
    logger.warn("could not cancel the payment at the provider", {
      error: serializeError(error),
    });
  }
}

/** Cancels one unpaid order that is past its time. Does nothing if it was paid or changed in the meantime. */
async function expireOne(orderId: string): Promise<boolean> {
  const expired = await withTransaction(async (tx) => {
    const order = await orderRepository.lockById(orderId, tx);
    if (
      !order ||
      order.status !== "waiting_payment" ||
      !order.reservation_expires_at ||
      new Date(order.reservation_expires_at) > new Date()
    ) {
      return false;
    }
    await cancelLocked(order, tx, "system", "Not paid in time");
    return true;
  });
  if (expired) await stopPayment(orderId);
  return expired;
}

/**
 * Gives back the stock of unpaid orders that ran out of time. Runs whenever
 * someone checks out or looks at their orders, and on a timer on the server
 * (`npm run orders:expire`), so held stock never stays held for long.
 */
export async function releaseExpiredReservations(): Promise<number> {
  let released = 0;
  for (let round = 0; round < 5; round++) {
    const ids = await orderRepository.findExpiredIds(20);
    if (ids.length === 0) break;
    for (const id of ids) {
      if (await expireOne(id)) released += 1;
    }
  }
  return released;
}

async function sweepQuietly() {
  try {
    await releaseExpiredReservations();
  } catch (error) {
    logger.warn("expiring old reservations failed", {
      error: serializeError(error),
    });
  }
}

export async function createOrder(
  customer: CustomerRecord,
  body: CreateOrderBody,
  idempotencyKey: string | null,
): Promise<PlacedOrder> {
  // Cash and transfers need no payment provider. Cards fail early (503) when none is set up, before anything is reserved.
  const provider = isOfflineMethod(body.paymentMethod)
    ? null
    : getPaymentProvider();
  const providerName = provider?.name ?? "manual";
  // Stock held by orders nobody paid for is freed first, so it can be bought now.
  await sweepQuietly();

  let repeated = false;
  const orderId = await withTransaction(async (tx) => {
    await cartRepository.lockCustomer(customer.id, tx);

    if (idempotencyKey) {
      const same = await orderRepository.findByIdempotencyKey(
        customer.id,
        idempotencyKey,
        tx,
      );
      if (same) {
        repeated = true;
        return same.id;
      }
    }

    await assertMethodAvailable(body.paymentMethod, body.market, tx);

    const cart = (
      await cartRepository.listLines(customer.id, body.market, tx)
    ).map((row) => ({ row, line: toCartLine(row) }));
    const picked = cart.filter(({ line }) => line.selected);
    if (picked.length === 0) {
      // Ticked lines that can no longer be bought (sold out meanwhile) are "your cart changed", not "select something".
      if (cart.some(({ row }) => row.selected)) {
        throw new ApiError("cart_changed");
      }
      throw new ApiError("unprocessable", {
        message: "Select at least one item in your cart to check out.",
      });
    }

    // From here the stock rows are locked: what is counted now is what is sold.
    const stock = new Map(
      (
        await orderRepository.lockInventory(
          picked.map(({ row }) => row.variant_id),
          body.market,
          tx,
        )
      ).map((lock) => [lock.variant_id, lock.on_hand - lock.reserved]),
    );
    const lines = picked
      .map(({ row }) => ({
        row,
        quantity: Math.min(
          row.quantity,
          Math.max(0, stock.get(row.variant_id) ?? 0),
        ),
      }))
      .filter(({ quantity }) => quantity > 0);

    const totals = calculateTotals(
      lines.map(({ row, quantity }) => ({
        unitAmount: Number(row.amount),
        quantity,
      })),
      body.market,
      await getPricingConfig(tx),
    );

    // The shopper must get exactly what they were shown.
    const seen = new Map(
      body.expected.items.map((item) => [item.variantId, item.quantity]),
    );
    const matches =
      lines.length === seen.size &&
      lines.every(
        ({ row, quantity }) => seen.get(row.variant_id) === quantity,
      ) &&
      totals.total === body.expected.total;
    if (!matches) throw new ApiError("cart_changed");

    const number = await orderRepository.nextNumber(body.market, tx);
    const currency = body.market === "PK" ? "PKR" : "EUR";
    const id = await orderRepository.insert(
      {
        number,
        market: body.market,
        currency,
        customerId: customer.id,
        idempotencyKey,
        email: body.contact.email,
        phone: body.contact.phone,
        paymentMethod: body.paymentMethod,
        // A transfer takes longer than a card payment: the customer has to go to their bank or wallet app.
        reservationExpiresAt: new Date(
          Date.now() +
            (isTransferMethod(body.paymentMethod)
              ? (await getPaymentSettings(tx)).manualHoldHours * 3_600_000
              : (await getReservationMinutes(tx)) * 60_000),
        ),
        ...totals,
        shipName: body.shipping.fullName,
        shipCompany: body.shipping.company || null,
        shipCountry: body.shipping.country,
        shipCity: body.shipping.city,
        shipAddress: body.shipping.address,
        shipZip: body.shipping.zip,
        bill: body.billing === "same" ? null : body.billing,
      },
      tx,
    );

    const items: NewOrderItem[] = lines.map(({ row, quantity }) => ({
      productId: row.product_id,
      variantId: row.variant_id,
      productSlug: row.slug,
      name: row.name,
      sku: row.sku,
      color: row.color_name,
      size: row.size_label,
      imageSrc: row.image_src,
      imageAlt: row.image_alt,
      imagePosition: row.image_position,
      quantity,
      unitAmount: Number(row.amount),
    }));
    await orderRepository.insertItems(id, items, tx);
    await orderRepository.addHistory(
      {
        orderId: id,
        from: null,
        to: "waiting_payment",
        actor: "customer",
        actorId: customer.id,
      },
      tx,
    );
    await orderRepository.insertPayment(
      {
        orderId: id,
        provider: providerName,
        method: body.paymentMethod,
        amount: totals.total,
        currency,
      },
      tx,
    );

    if (body.paymentMethod === "cod") {
      // Cash on delivery: nothing to wait for. The goods are sold now, the order goes straight to staff,
      // and the payment stays pending until the cash is collected.
      for (const { row, quantity } of lines) {
        await orderRepository.sell(
          row.variant_id,
          body.market,
          quantity,
          false,
          id,
          tx,
          "Order placed (cash on delivery)",
        );
      }
      await orderRepository.update(
        id,
        {
          status: "processing",
          stockState: "committed",
          clearReservation: true,
        },
        tx,
      );
      await orderRepository.addHistory(
        {
          orderId: id,
          from: "waiting_payment",
          to: "processing",
          actor: "system",
          note: "Cash on delivery: confirmed at checkout",
        },
        tx,
      );
    } else {
      for (const { row, quantity } of lines) {
        await orderRepository.reserve(
          row.variant_id,
          body.market,
          quantity,
          tx,
        );
      }
    }
    // What was ordered leaves the cart; anything left unticked stays.
    await cartRepository.remove(
      customer.id,
      lines.map(({ row }) => row.variant_id),
      tx,
    );
    return id;
  });

  const row = (await orderRepository.findById(orderId))!;
  const order = await toDto(row);
  if (repeated || !provider) {
    return { order, payment: { provider: providerName } };
  }

  try {
    const start = await provider.start({
      id: row.id,
      number: row.number,
      market: row.market,
      currency: row.currency,
      amount: order.total,
      email: row.email,
    });
    if (start.providerRef) {
      await orderRepository.setPaymentRef(row.id, start.providerRef);
    }
    return {
      order,
      payment: { provider: provider.name, clientSecret: start.clientSecret },
    };
  } catch (error) {
    // The order exists but cannot be paid: give the stock back instead of holding it for nothing.
    logger.error("payment provider could not start a payment", {
      error: serializeError(error),
    });
    await cancelUnpaid(row.id, "system", "Payment could not be started");
    throw new ApiError("service_unavailable", {
      message: "We couldn't start the payment. Please try again in a moment.",
    });
  }
}

/**
 * Cancels an unpaid order (locking it first). Returns false if it is no longer
 * waiting for payment. `inTransaction` runs in the same transaction after the
 * cancellation, so something that must be saved with it (the admin's audit
 * row) is saved together or not at all.
 */
export async function cancelUnpaid(
  orderId: string,
  actor: ActorType,
  reason: string,
  actorId: string | null = null,
  inTransaction?: (tx: Tx) => Promise<void>,
): Promise<boolean> {
  const cancelled = await withTransaction(async (tx) => {
    const order = await orderRepository.lockById(orderId, tx);
    if (!order || order.status !== "waiting_payment") return false;
    await cancelLocked(order, tx, actor, reason, actorId);
    if (inTransaction) await inTransaction(tx);
    return true;
  });
  if (cancelled) await stopPayment(orderId);
  return cancelled;
}

export async function listOrders(customerId: string): Promise<OrderDto[]> {
  await sweepQuietly();
  const rows = await orderRepository.listForCustomer(
    customerId,
    MAX_ORDERS_LISTED,
  );
  const ids = rows.map((row) => row.id);
  const [items, proofs] = await Promise.all([
    orderRepository.listItems(ids),
    orderRepository.listLatestProofs(ids),
  ]);
  return rows.map((row) => toOrderDto(row, items, proofs));
}

function parseNumber(raw: string): string {
  const parsed = orderNumberSchema.safeParse(raw);
  if (!parsed.success) throw notFound();
  return parsed.data;
}

export async function getOrder(
  customerId: string,
  rawNumber: string,
): Promise<OrderDto> {
  const number = parseNumber(rawNumber);
  let row = await orderRepository.findOwned(customerId, number);
  if (!row) throw notFound();

  if (
    row.status === "waiting_payment" &&
    row.reservation_expires_at &&
    new Date(row.reservation_expires_at) <= new Date()
  ) {
    await expireOne(row.id);
    row = (await orderRepository.findOwned(customerId, number))!;
  }
  return toDto(row);
}

/** The customer cancels an order that has not been paid yet. */
export async function cancelOrder(
  customerId: string,
  rawNumber: string,
): Promise<OrderDto> {
  const number = parseNumber(rawNumber);
  const row = await orderRepository.findOwned(customerId, number);
  if (!row) throw notFound();

  if (row.payment_status === "awaiting_verification") {
    throw new ApiError("conflict", {
      message:
        "We are checking your payment, so this order cannot be cancelled now. Please contact us if you want to cancel it.",
    });
  }

  const cancelled = await cancelUnpaid(
    row.id,
    "customer",
    "Cancelled by the customer",
    customerId,
  );
  if (!cancelled) {
    const current = (await orderRepository.findById(row.id))!;
    // Cancelling twice is fine; cancelling an order that is already paid is not.
    if (current.status !== "cancelled") {
      throw new ApiError("conflict", {
        message: "This order can no longer be cancelled.",
      });
    }
  }
  return toDto((await orderRepository.findById(row.id))!);
}

/** Cancels every unpaid order of a customer (used when the account is deleted), giving the stock back. */
export async function cancelOpenOrders(customerId: string): Promise<void> {
  const ids = await withTransaction((tx) =>
    orderRepository.listOpenIds(customerId, tx),
  );
  for (const id of ids) {
    await cancelUnpaid(id, "system", "Account deleted", customerId);
  }
}

/**
 * The provider told us the money arrived. Safe to call more than once: only
 * the first call changes anything. This is what a verified webhook calls.
 */
export async function confirmPayment(orderId: string): Promise<void> {
  await withTransaction((tx) =>
    confirmPaymentIn(tx, orderId, { actor: "payment" }),
  );
}

/** Who says the money arrived, for the order's history: the provider, or a member of staff who checked a transfer. */
export interface PaymentConfirmer {
  actor: ActorType;
  actorId?: string | null;
  note?: string | null;
}

/**
 * confirmPayment inside the caller's transaction, so something that must be
 * saved with it (the admin's audit row and the approved proof) is saved
 * together or not at all.
 */
export async function confirmPaymentIn(
  tx: Tx,
  orderId: string,
  by: PaymentConfirmer,
): Promise<void> {
  {
    const order = await orderRepository.lockById(orderId, tx);
    if (!order) throw notFound();
    if (order.payment_status === "paid") return;
    if (order.status !== "waiting_payment" && order.status !== "cancelled") {
      return;
    }

    const items = await orderRepository.listItems([order.id], tx);
    const locks = new Map(
      (
        await orderRepository.lockInventory(
          items.flatMap((item) => (item.variant_id ? [item.variant_id] : [])),
          order.market,
          tx,
        )
      ).map((lock) => [lock.variant_id, lock]),
    );

    if (order.status === "waiting_payment") {
      for (const item of items) {
        if (item.variant_id) {
          await orderRepository.sell(
            item.variant_id,
            order.market,
            item.quantity,
            true,
            order.id,
            tx,
          );
        }
      }
      await orderRepository.update(
        order.id,
        {
          status: "processing",
          paymentStatus: "paid",
          stockState: "committed",
          clearReservation: true,
          paid: true,
        },
        tx,
      );
      await orderRepository.setPaymentStatus(order.id, "succeeded", tx);
      await orderRepository.addHistory(
        {
          orderId: order.id,
          from: "waiting_payment",
          to: "processing",
          actor: by.actor,
          actorId: by.actorId ?? null,
          note: by.note ?? null,
        },
        tx,
      );
      return;
    }

    // The payment arrived after the order was cancelled (its time ran out). Take the stock again if it is still there.
    const stillThere = items.every((item) => {
      const lock = item.variant_id ? locks.get(item.variant_id) : undefined;
      return (
        lock !== undefined && lock.on_hand - lock.reserved >= item.quantity
      );
    });
    await orderRepository.setPaymentStatus(order.id, "succeeded", tx);

    if (stillThere) {
      for (const item of items) {
        await orderRepository.sell(
          item.variant_id!,
          order.market,
          item.quantity,
          false,
          order.id,
          tx,
        );
      }
      await orderRepository.update(
        order.id,
        {
          status: "processing",
          paymentStatus: "paid",
          stockState: "committed",
          paid: true,
          cancel: "clear",
        },
        tx,
      );
      await orderRepository.addHistory(
        {
          orderId: order.id,
          from: "cancelled",
          to: "processing",
          actor: by.actor,
          actorId: by.actorId ?? null,
          note: "Paid after the order was cancelled; the stock was still available.",
        },
        tx,
      );
      return;
    }

    await orderRepository.update(
      order.id,
      { paymentStatus: "paid", paid: true },
      tx,
    );
    await orderRepository.addHistory(
      {
        orderId: order.id,
        from: "cancelled",
        to: "cancelled",
        actor: by.actor,
        actorId: by.actorId ?? null,
        note: "PAID AFTER CANCELLATION and the stock is gone: this order needs a refund.",
      },
      tx,
    );
    logger.warn("an order was paid after it was cancelled and needs a refund", {
      orderNumber: order.number,
    });
  }
}

/**
 * Staff cancel a cash-on-delivery order that was never paid (a fake order, or
 * the customer refused it at the door). Its goods were already sold at
 * checkout, so they go back on the shelf. Returns false if the order is not
 * such an order (any more). `inTransaction` runs in the same transaction.
 */
export async function cancelUnpaidCod(
  orderId: string,
  staffId: string,
  reason: string,
  inTransaction?: (tx: Tx) => Promise<void>,
): Promise<boolean> {
  return withTransaction(async (tx) => {
    const order = await orderRepository.lockById(orderId, tx);
    if (
      !order ||
      order.payment_method !== "cod" ||
      order.payment_status !== "pending" ||
      (order.status !== "processing" && order.status !== "in_delivery")
    ) {
      return false;
    }

    const items = await orderRepository.listItems([order.id], tx);
    const stocked = items.filter((item) => item.variant_id !== null);
    await orderRepository.lockInventory(
      [...new Set(stocked.map((item) => item.variant_id!))],
      order.market,
      tx,
    );
    // Always in variant order, like the order code, so two jobs never wait on each other.
    for (const item of [...stocked].sort((a, b) =>
      a.variant_id!.localeCompare(b.variant_id!),
    )) {
      await adminOrderRepository.restock(
        {
          variantId: item.variant_id!,
          market: order.market,
          quantity: item.quantity,
          orderId: order.id,
          staffId,
          note: `Cancelled before the cash was collected: order ${order.number}`,
        },
        tx,
      );
    }

    await orderRepository.update(
      order.id,
      { status: "cancelled", stockState: "released", cancel: { reason } },
      tx,
    );
    await orderRepository.setPaymentStatus(order.id, "cancelled", tx);
    await orderRepository.addHistory(
      {
        orderId: order.id,
        from: order.status,
        to: "cancelled",
        actor: "staff",
        actorId: staffId,
        note: reason,
      },
      tx,
    );
    if (inTransaction) await inTransaction(tx);
    return true;
  });
}

/** The provider told us the payment failed. The order keeps waiting, so the customer can try again until the time runs out. */
export async function recordPaymentFailure(
  orderId: string,
  failureCode: string | null,
): Promise<void> {
  await withTransaction(async (tx) => {
    const order = await orderRepository.lockById(orderId, tx);
    if (!order) throw notFound();
    if (order.status !== "waiting_payment" || order.payment_status === "paid") {
      return;
    }
    await orderRepository.update(order.id, { paymentStatus: "failed" }, tx);
    await orderRepository.setPaymentStatus(order.id, "failed", tx, failureCode);
    await orderRepository.addHistory(
      {
        orderId: order.id,
        from: "waiting_payment",
        to: "waiting_payment",
        actor: "payment",
        note: failureCode
          ? `Payment failed (${failureCode})`
          : "Payment failed",
      },
      tx,
    );
  });
}

/**
 * Development only: plays the part of the provider's webhook so the whole
 * flow can be tried without a payment account. Refused in production, where
 * the simulated provider cannot be selected at all.
 */
export async function simulatePayment(
  customerId: string,
  rawNumber: string,
  outcome: "success" | "failure",
): Promise<OrderDto> {
  if (getPaymentProvider().name !== "simulated") throw notFound();

  const number = parseNumber(rawNumber);
  const row = await orderRepository.findOwned(customerId, number);
  if (!row) throw notFound();

  if (outcome === "success") await confirmPayment(row.id);
  else await recordPaymentFailure(row.id, "simulated_failure");
  return toDto((await orderRepository.findById(row.id))!);
}
