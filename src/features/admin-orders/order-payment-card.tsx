"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { paymentMethodLabels } from "@/features/orders/payment-methods";

import {
  confirmPayment,
  rejectPayment,
  screenshotUrl,
  type AdminOrderDetail,
} from "./order-detail-service";
import {
  DetailCard,
  Field,
  FormError,
  dateTimeFormat,
  inputClass,
  useOrderMutation,
} from "./order-detail-ui";
import { paymentStatusLabel } from "./orders-labels";
import { cn } from "@/utils/cn";

const PROOF_STYLE = {
  pending: "bg-[#ff9f24]/10 text-[#ff9f24]",
  approved: "bg-[#279f51]/10 text-success",
  rejected: "bg-danger/10 text-danger",
} as const;

const methodLabel = (method: string) =>
  (paymentMethodLabels as Record<string, string>)[method] ?? method;

function ConfirmPaymentDialog({
  order,
  onClose,
}: {
  order: AdminOrderDetail;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const confirm = useOrderMutation(
    order.number,
    () => confirmPayment(order.number, note.trim() || undefined),
    "Payment confirmed",
    onClose,
  );
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => confirm.mutate()}
      title="Confirm this payment?"
      description="Only confirm when the money has really arrived. The customer is emailed."
      confirmLabel="Confirm payment"
      pendingLabel="Confirming…"
      pending={confirm.isPending}
    >
      <Field id="confirm-note" label="Note for the order history (optional)">
        <input
          id="confirm-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="e.g. TID 123 checked in the bank app"
          className={inputClass}
        />
      </Field>
      <FormError error={confirm.error} />
    </ConfirmDialog>
  );
}

function RejectPaymentDialog({
  order,
  onClose,
}: {
  order: AdminOrderDetail;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [shown, setShown] = useState(false);
  const reject = useOrderMutation(
    order.number,
    () => rejectPayment(order.number, reason.trim()),
    "Payment proof rejected",
    onClose,
  );
  const missing = shown && !reason.trim();
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => {
        setShown(true);
        if (reason.trim()) reject.mutate();
      }}
      title="Reject this payment proof?"
      description="The customer is emailed your reason and can send a new proof."
      confirmLabel="Reject proof"
      pendingLabel="Rejecting…"
      pending={reject.isPending}
    >
      <Field
        id="reject-reason"
        label="Reason (the customer sees this)"
        error={missing ? "Please give a reason" : undefined}
      >
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          rows={3}
          aria-invalid={missing}
          aria-describedby="reject-reason-error"
          className={cn(inputClass, "h-auto py-2")}
        />
      </Field>
      <FormError error={reject.error} />
    </ConfirmDialog>
  );
}

/** How the order is paid, the customer's proofs, and confirming or rejecting the money. */
export function OrderPaymentCard({
  order,
  canVerify,
}: {
  order: AdminOrderDetail;
  canVerify: boolean;
}) {
  const [dialog, setDialog] = useState<"confirm" | "reject" | null>(null);
  const close = () => setDialog(null);
  const { canConfirm, canReject } = order.paymentActions;

  return (
    <DetailCard title="Payment">
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-xs text-muted-foreground">Method</dt>
          <dd className="text-sm text-foreground">
            {methodLabel(order.paymentMethod)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd className="text-sm font-medium text-foreground">
            {paymentStatusLabel(order.paymentStatus)}
          </dd>
        </div>
        {order.paidAt ? (
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Paid</dt>
            <dd className="text-sm text-foreground">
              {dateTimeFormat.format(new Date(order.paidAt))}
            </dd>
          </div>
        ) : null}
      </dl>

      {order.paymentProofs.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {order.paymentProofs.map((proof) => (
            <li key={proof.id} className="rounded-lg bg-white p-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">
                  {proof.transactionId
                    ? `Transaction ${proof.transactionId}`
                    : "Screenshot only"}
                </p>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-medium capitalize",
                    PROOF_STYLE[proof.status],
                  )}
                >
                  {proof.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sent {dateTimeFormat.format(new Date(proof.submittedAt))}
                {proof.reviewedBy
                  ? ` · checked by ${proof.reviewedBy.name}`
                  : ""}
              </p>
              {proof.reviewNote ? (
                <p className="mt-1 text-xs text-foreground">
                  “{proof.reviewNote}”
                </p>
              ) : null}
              {proof.hasScreenshot && canVerify ? (
                <a
                  href={screenshotUrl(order.number, proof.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm font-medium text-accent underline-offset-2 hover:underline"
                >
                  Open screenshot
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canVerify && (canConfirm || canReject) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {canConfirm ? (
            <button
              type="button"
              onClick={() => setDialog("confirm")}
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Confirm payment
            </button>
          ) : null}
          {canReject ? (
            <button
              type="button"
              onClick={() => setDialog("reject")}
              className="rounded-lg border border-danger bg-white px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Reject proof
            </button>
          ) : null}
        </div>
      ) : null}

      {dialog === "confirm" ? (
        <ConfirmPaymentDialog order={order} onClose={close} />
      ) : null}
      {dialog === "reject" ? (
        <RejectPaymentDialog order={order} onClose={close} />
      ) : null}
    </DetailCard>
  );
}
