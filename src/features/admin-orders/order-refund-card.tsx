"use client";

import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  formatMinor,
  parseMajorToMinor,
} from "@/features/admin-shell/admin-money";
import { cn } from "@/utils/cn";

import { createRefund, type AdminOrderDetail } from "./order-detail-service";
import { majorText, refundProblems } from "./order-detail-forms";
import {
  DetailCard,
  Field,
  FormError,
  dateTimeFormat,
  inputClass,
  useOrderMutation,
} from "./order-detail-ui";

/** Records a refund, in the order's own currency, never above what is left to refund. */
export function OrderRefundCard({
  order,
  canRefund,
}: {
  order: AdminOrderDetail;
  canRefund: boolean;
}) {
  const refundable = order.amounts.refundableTotal;
  const money = (minor: number) =>
    formatMinor(minor, order.currency, { alwaysCents: true });

  // Until the person types, the box offers everything that is left (it changes after each refund).
  const [typed, setTyped] = useState<string | null>(null);
  const amount = typed ?? majorText(refundable);
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(false);
  const [shown, setShown] = useState(false);
  const [asking, setAsking] = useState(false);
  const problems = refundProblems({ amount, reason }, refundable);
  const minor = parseMajorToMinor(amount);

  const refund = useOrderMutation(
    order.number,
    () =>
      createRefund(order.number, {
        amount: minor ?? 0,
        reason: reason.trim(),
        restock,
      }),
    "Refund recorded",
    () => {
      setAsking(false);
      setTyped(null);
      setReason("");
      setRestock(false);
      setShown(false);
    },
  );

  const showForm = canRefund && refundable > 0;
  if (!showForm && order.refunds.length === 0) return null;

  return (
    <DetailCard title="Refunds">
      {showForm ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setShown(true);
            if (Object.keys(problems).length === 0) setAsking(true);
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-sm text-muted-foreground">
            Up to{" "}
            <span className="font-semibold text-foreground">
              {money(refundable)}
            </span>{" "}
            can still be refunded.
          </p>
          <Field
            id="refund-amount"
            label={`Amount (${order.currency})`}
            error={shown ? problems.amount : undefined}
          >
            <input
              id="refund-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setTyped(e.target.value)}
              aria-invalid={shown && Boolean(problems.amount)}
              aria-describedby="refund-amount-error"
              className={inputClass}
            />
          </Field>
          <Field
            id="refund-reason"
            label="Reason"
            error={shown ? problems.reason : undefined}
          >
            <textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={2}
              aria-invalid={shown && Boolean(problems.reason)}
              aria-describedby="refund-reason-error"
              className={cn(inputClass, "h-auto py-2")}
            />
          </Field>
          <Checkbox
            checked={restock}
            onChange={(e) => setRestock(e.target.checked)}
            label="Put the returned items back into stock"
          />
          <button
            type="submit"
            className="self-start rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Record refund
          </button>
        </form>
      ) : null}

      {order.refunds.length > 0 ? (
        <ul
          className={cn(
            "flex flex-col gap-2",
            showForm && "mt-3 border-t border-border pt-3",
          )}
        >
          {order.refunds.map((item) => (
            <li key={item.id} className="rounded-lg bg-white p-2.5 text-sm">
              <p className="flex justify-between gap-2 font-medium text-foreground">
                <span>{money(item.amount)}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {dateTimeFormat.format(new Date(item.createdAt))}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                “{item.reason}”{item.by ? ` · ${item.by.name}` : ""}
                {item.restock ? " · items back in stock" : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {asking ? (
        <ConfirmDialog
          open
          onClose={() => setAsking(false)}
          onConfirm={() => refund.mutate()}
          title={`Refund ${money(minor ?? 0)}?`}
          description={`This records the refund on order ${order.number}. No money moves automatically: pay the customer back yourself.`}
          confirmLabel="Record refund"
          pendingLabel="Saving…"
          pending={refund.isPending}
        >
          <FormError error={refund.error} />
        </ConfirmDialog>
      ) : null}
    </DetailCard>
  );
}
