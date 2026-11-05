import "server-only";

import { recordAudit } from "@/server/audit/audit";
import { withTransaction } from "@/server/db/transaction";
import {
  orderPaymentConfirmedEmail,
  orderPaymentRejectedEmail,
} from "@/server/email/templates";
import { ApiError } from "@/server/http/api-error";
import { paymentActions } from "@/server/orders/order-flow";
import { adminOrderRepository } from "@/server/repositories/admin-order-repository";
import { orderRepository } from "@/server/repositories/order-repository";
import {
  getAdminOrder,
  notifyCustomer,
  parseOrderNumber,
  type AdminOrderDto,
} from "@/server/services/admin-order-service";
import { confirmPaymentIn } from "@/server/services/order-service";
import { getPaymentSettings } from "@/server/services/settings-service";
import type { AdminContext } from "@/server/services/staff-admin-service";
import { getStorage } from "@/server/storage";
import type { StoredFile } from "@/server/storage";
import type {
  ConfirmPaymentBody,
  RejectPaymentBody,
} from "@/server/validation/admin-order-schemas";

const notFound = () => new ApiError("not_found");
const conflict = (message: string) => new ApiError("conflict", { message });

/**
 * Staff say the money for an order is there. Two cases:
 *  - cash on delivery: the courier handed over the cash. The order is already
 *    with staff; only its payment becomes "paid";
 *  - bank transfer, Easypaisa, JazzCash: staff saw the money (in the bank app
 *    or wallet) for an order that waited for it. Its stock is sold and it goes
 *    to "processing", exactly as when a card payment succeeds, and the
 *    customer's proof is marked approved.
 * Recorded in the order's history and in the audit log, in the same transaction.
 */
export async function confirmOrderPayment(
  ctx: AdminContext,
  rawNumber: string,
  body: ConfirmPaymentBody,
): Promise<AdminOrderDto> {
  const number = parseOrderNumber(rawNumber);
  const notify: { to: string; name: string }[] = [];

  await withTransaction(async (tx) => {
    const order = await adminOrderRepository.lockByNumber(number, tx);
    if (!order) throw notFound();

    const { canConfirm } = paymentActions({
      method: order.payment_method,
      status: order.status,
      paymentStatus: order.payment_status,
    });
    if (!canConfirm) {
      throw conflict(
        order.payment_status === "paid"
          ? "This order is already marked as paid."
          : order.payment_method === "card"
            ? "Card payments are confirmed automatically."
            : "This order's payment cannot be confirmed right now.",
      );
    }

    if (order.payment_method === "cod") {
      await orderRepository.update(
        order.id,
        { paymentStatus: "paid", paid: true },
        tx,
      );
      await orderRepository.setPaymentStatus(order.id, "succeeded", tx);
      await orderRepository.addHistory(
        {
          orderId: order.id,
          from: order.status,
          to: order.status,
          actor: "staff",
          actorId: ctx.actor.id,
          note: body.note
            ? `Cash collected: ${body.note}`
            : "Cash collected on delivery",
        },
        tx,
      );
    } else {
      await confirmPaymentIn(tx, order.id, {
        actor: "staff",
        actorId: ctx.actor.id,
        note: body.note
          ? `Payment confirmed: ${body.note}`
          : "Payment confirmed by staff",
      });
      await adminOrderRepository.reviewPendingProofs(
        order.id,
        { status: "approved", staffId: ctx.actor.id, note: body.note ?? null },
        tx,
      );
      notify.push({ to: order.email, name: order.ship_name });
    }

    const after = (await adminOrderRepository.findByNumber(number, tx))!;
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "orders.payment_confirm",
        entityType: "order",
        entityId: number,
        before: {
          status: order.status,
          paymentStatus: order.payment_status,
        },
        after: {
          status: after.status,
          paymentStatus: after.payment_status,
          method: order.payment_method,
          ...(body.note ? { note: body.note } : {}),
        },
      },
      ctx.requestId,
    );
  });

  for (const target of notify) {
    await notifyCustomer(
      orderPaymentConfirmedEmail({ ...target, orderNumber: number }),
    );
  }
  return getAdminOrder(number);
}

/**
 * The customer's proof does not check out (wrong amount, a transaction that
 * is not there, an unreadable screenshot). The reason is shown to the
 * customer, who can send another proof; the order keeps its stock for a
 * fresh hold time.
 */
export async function rejectOrderPayment(
  ctx: AdminContext,
  rawNumber: string,
  body: RejectPaymentBody,
): Promise<AdminOrderDto> {
  const number = parseOrderNumber(rawNumber);
  const notify: { to: string; name: string }[] = [];

  await withTransaction(async (tx) => {
    const order = await adminOrderRepository.lockByNumber(number, tx);
    if (!order) throw notFound();

    const { canReject } = paymentActions({
      method: order.payment_method,
      status: order.status,
      paymentStatus: order.payment_status,
    });
    if (!canReject) {
      throw conflict("There is no payment proof waiting to be checked.");
    }

    const { manualHoldHours } = await getPaymentSettings(tx);
    await adminOrderRepository.reviewPendingProofs(
      order.id,
      { status: "rejected", staffId: ctx.actor.id, note: body.reason },
      tx,
    );
    await orderRepository.update(
      order.id,
      {
        paymentStatus: "failed",
        reservationExpiresAt: new Date(
          Date.now() + manualHoldHours * 3_600_000,
        ),
      },
      tx,
    );
    await orderRepository.setPaymentStatus(
      order.id,
      "failed",
      tx,
      "proof_rejected",
    );
    await orderRepository.addHistory(
      {
        orderId: order.id,
        from: order.status,
        to: order.status,
        actor: "staff",
        actorId: ctx.actor.id,
        note: `Payment proof rejected: ${body.reason}`,
      },
      tx,
    );
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "orders.payment_reject",
        entityType: "order",
        entityId: number,
        before: { paymentStatus: order.payment_status },
        after: { paymentStatus: "failed", reason: body.reason },
      },
      ctx.requestId,
    );
    notify.push({ to: order.email, name: order.ship_name });
  });

  for (const target of notify) {
    await notifyCustomer(
      orderPaymentRejectedEmail({
        ...target,
        orderNumber: number,
        reason: body.reason,
      }),
    );
  }
  return getAdminOrder(number);
}

/** A customer's payment screenshot. Never public: only the admin route for staff who may verify payments calls this. */
export async function getPaymentScreenshot(
  rawNumber: string,
  proofId: string,
): Promise<StoredFile> {
  const order = await adminOrderRepository.findByNumber(
    parseOrderNumber(rawNumber),
  );
  if (!order) throw notFound();
  const proof = await adminOrderRepository.findProof(order.id, proofId);
  if (!proof?.file_key) throw notFound();

  const file = await getStorage().get(proof.file_key);
  if (!file) throw notFound();
  return file;
}
