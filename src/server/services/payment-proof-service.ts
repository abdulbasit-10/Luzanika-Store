import "server-only";

import { randomBytes } from "node:crypto";

import { withTransaction } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import { logger, serializeError } from "@/server/logger";
import type { OrderDto } from "@/server/orders/order-dto";
import {
  PAYMENT_PROOF_FIELD,
  processPaymentProof,
} from "@/server/media/payment-proof-image";
import { isTransferMethod } from "@/server/payments/methods";
import { orderRepository } from "@/server/repositories/order-repository";
import { getOrder } from "@/server/services/order-service";
import { getPaymentSettings } from "@/server/services/settings-service";
import { getStorage } from "@/server/storage";
import { paymentProofFieldsSchema } from "@/server/validation/order-schemas";

/** Each rejected proof lets the customer try again, but not without end. */
export const MAX_PROOFS_PER_ORDER = 5;

const conflict = (message: string) => new ApiError("conflict", { message });

/**
 * The customer says they paid by bank transfer, Easypaisa or JazzCash and
 * sends the transaction ID and/or a screenshot. Nothing is trusted: the order
 * only waits for staff to check it ("awaiting verification"), and keeps its
 * stock while it waits. A rejected proof can be replaced by a new one.
 */
export async function submitPaymentProof(
  customerId: string,
  rawNumber: string,
  input: { fields: Record<string, string>; screenshot: Buffer | null },
): Promise<OrderDto> {
  const parsed = paymentProofFieldsSchema.safeParse(input.fields);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[String(issue.path[0] ?? "transactionId")] ??= issue.message;
    }
    throw new ApiError("validation_failed", { fields });
  }
  const transactionRef = parsed.data.transactionId ?? null;
  if (!transactionRef && !input.screenshot) {
    const message =
      "Enter the transaction ID or add a screenshot of the payment.";
    throw new ApiError("validation_failed", {
      message,
      fields: { transactionId: message, [PAYMENT_PROOF_FIELD]: message },
    });
  }

  // Also answers 404 for another customer's order and expires an order whose time ran out.
  const order = await getOrder(customerId, rawNumber);
  if (!isTransferMethod(order.paymentMethod)) {
    throw conflict("This order is not paid by bank transfer or mobile wallet.");
  }
  if (order.status !== "waiting_payment") {
    throw conflict(
      order.status === "cancelled"
        ? "This order was cancelled because it was not paid in time. Please place a new order."
        : "This order has already been paid.",
    );
  }

  // The picture is checked and shrunk first (a bad file is refused before anything is saved).
  const processed = input.screenshot
    ? await processPaymentProof(input.screenshot)
    : null;
  const fileKey = processed
    ? `payment-proofs/${randomBytes(16).toString("hex")}.webp`
    : null;
  if (processed && fileKey) await getStorage().put(fileKey, processed);

  try {
    await withTransaction(async (tx) => {
      const row = await orderRepository.findOwned(customerId, order.number, tx);
      if (!row) throw new ApiError("not_found");
      const locked = await orderRepository.lockById(row.id, tx);
      if (!locked) throw new ApiError("not_found");

      if (locked.status !== "waiting_payment") {
        throw conflict("This order can no longer receive a payment proof.");
      }
      if (locked.payment_status === "awaiting_verification") {
        throw conflict(
          "We already have your payment proof and are checking it. We will email you when it is confirmed.",
        );
      }
      if (
        locked.reservation_expires_at &&
        new Date(locked.reservation_expires_at) <= new Date()
      ) {
        throw conflict(
          "This order ran out of time to be paid. Please place a new order.",
        );
      }
      if (
        (await orderRepository.countProofs(locked.id, tx)) >=
        MAX_PROOFS_PER_ORDER
      ) {
        throw conflict(
          "You have sent too many payment proofs for this order. Please contact us.",
        );
      }
      if (
        transactionRef &&
        (await orderRepository.findOtherOrderWithRef(
          locked.id,
          transactionRef,
          tx,
        ))
      ) {
        throw new ApiError("conflict", {
          message:
            "This transaction ID has already been used for another order.",
          fields: { transactionId: "This transaction ID was already used." },
        });
      }

      await orderRepository.insertProof(
        { orderId: locked.id, transactionRef, fileKey },
        tx,
      );
      // A new attempt after a rejected one is a new payment row, like a new try with a card.
      if (
        (await orderRepository.latestPaymentStatus(locked.id, tx)) === "failed"
      ) {
        await orderRepository.insertPayment(
          {
            orderId: locked.id,
            provider: "manual",
            method: locked.payment_method,
            amount: Number(locked.total),
            currency: locked.currency,
          },
          tx,
        );
      }
      // While staff look at it the order keeps its stock: it does not run out of time under them.
      await orderRepository.update(
        locked.id,
        { paymentStatus: "awaiting_verification", clearReservation: true },
        tx,
      );
      await orderRepository.addHistory(
        {
          orderId: locked.id,
          from: "waiting_payment",
          to: "waiting_payment",
          actor: "customer",
          actorId: customerId,
          note: "Payment proof sent",
        },
        tx,
      );
    });
  } catch (error) {
    // Nothing refers to the file: do not leave it lying around.
    if (fileKey) {
      await getStorage()
        .delete(fileKey)
        .catch((deleteError) =>
          logger.warn("could not remove an unused payment proof file", {
            error: serializeError(deleteError),
          }),
        );
    }
    throw error;
  }

  return getOrder(customerId, order.number);
}

/**
 * Where to send the money, for the page that shows it after the order is
 * placed (and at checkout). Only the methods that are set up are included.
 */
export async function getPaymentOptions(market: "PK" | "DE") {
  if (market === "DE")
    return { market, methods: [{ method: "card" as const }] };

  const { details, manualHoldHours } = await getPaymentSettings();
  return {
    market,
    holdHours: manualHoldHours,
    methods: [
      { method: "cod" as const },
      ...(details.bank
        ? [{ method: "bank_transfer" as const, details: details.bank }]
        : []),
      ...(details.easypaisa
        ? [{ method: "easypaisa" as const, details: details.easypaisa }]
        : []),
      ...(details.jazzcash
        ? [{ method: "jazzcash" as const, details: details.jazzcash }]
        : []),
    ],
  };
}
