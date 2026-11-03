"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/utils/cn";

import {
  changeOrderStatus,
  updateTracking,
  type AdminOrderDetail,
  type StaffTargetStatus,
} from "./order-detail-service";
import { shippingProblems } from "./order-detail-forms";
import {
  DetailCard,
  Fact,
  Field,
  FormError,
  dateTimeFormat,
  inputClass,
  useOrderMutation,
} from "./order-detail-ui";
import { StatusChip } from "./orders-table";

type DialogKind = "ship" | "complete" | "cancel" | "tracking";

const MOVES: Record<
  StaffTargetStatus,
  { label: string; dialog: DialogKind; danger?: boolean }
> = {
  in_delivery: { label: "Mark as in delivery", dialog: "ship" },
  completed: { label: "Mark as completed", dialog: "complete" },
  cancelled: { label: "Cancel order", dialog: "cancel", danger: true },
};

/** Carrier and tracking number: needed to ship an order, and fixable afterwards. */
function ShippingDialog({
  order,
  mode,
  onClose,
}: {
  order: AdminOrderDetail;
  mode: "ship" | "tracking";
  onClose: () => void;
}) {
  const [carrier, setCarrier] = useState(order.delivery?.carrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(
    order.delivery?.trackingNumber ?? "",
  );
  const [shown, setShown] = useState(false);
  const problems = shippingProblems({ carrier, trackingNumber });

  const ship = useOrderMutation(
    order.number,
    () =>
      mode === "ship"
        ? changeOrderStatus(order.number, {
            status: "in_delivery",
            carrier: carrier.trim(),
            trackingNumber: trackingNumber.trim(),
          })
        : updateTracking(order.number, {
            carrier: carrier.trim(),
            trackingNumber: trackingNumber.trim(),
          }),
    mode === "ship" ? "Order is now in delivery" : "Tracking updated",
    onClose,
  );

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => {
        setShown(true);
        if (Object.keys(problems).length === 0) ship.mutate();
      }}
      title={mode === "ship" ? "Hand to the carrier" : "Change tracking"}
      description={
        mode === "ship"
          ? "The customer is emailed that the order is on its way."
          : "The customer is not emailed again."
      }
      confirmLabel={mode === "ship" ? "Mark as in delivery" : "Save tracking"}
      pendingLabel="Saving…"
      pending={ship.isPending}
    >
      <div className="flex flex-col gap-3">
        <Field
          id="carrier"
          label="Carrier"
          error={shown ? problems.carrier : undefined}
        >
          <input
            id="carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="e.g. TCS, Leopards, DHL"
            maxLength={80}
            aria-invalid={shown && Boolean(problems.carrier)}
            aria-describedby="carrier-error"
            className={inputClass}
          />
        </Field>
        <Field
          id="tracking"
          label="Tracking number"
          error={shown ? problems.trackingNumber : undefined}
        >
          <input
            id="tracking"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            maxLength={120}
            aria-invalid={shown && Boolean(problems.trackingNumber)}
            aria-describedby="tracking-error"
            className={inputClass}
          />
        </Field>
        <FormError error={ship.error} />
      </div>
    </ConfirmDialog>
  );
}

function CancelDialog({
  order,
  onClose,
}: {
  order: AdminOrderDetail;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const cancel = useOrderMutation(
    order.number,
    () =>
      changeOrderStatus(order.number, {
        status: "cancelled",
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }),
    "Order cancelled",
    onClose,
  );

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => cancel.mutate()}
      title={`Cancel order ${order.number}?`}
      description="The goods go back into stock and the customer is emailed. This cannot be undone."
      confirmLabel="Cancel order"
      pendingLabel="Cancelling…"
      pending={cancel.isPending}
    >
      <Field id="cancel-reason" label="Reason (optional)">
        <textarea
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
          rows={2}
          className={cn(inputClass, "h-auto py-2")}
        />
      </Field>
      <FormError error={cancel.error} />
    </ConfirmDialog>
  );
}

function CompleteDialog({
  order,
  onClose,
}: {
  order: AdminOrderDetail;
  onClose: () => void;
}) {
  const complete = useOrderMutation(
    order.number,
    () => changeOrderStatus(order.number, { status: "completed" }),
    "Order completed",
    onClose,
  );

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => complete.mutate()}
      title={`Mark ${order.number} as completed?`}
      description="Use this once the parcel has arrived. The customer is emailed."
      confirmLabel="Mark as completed"
      pendingLabel="Saving…"
      pending={complete.isPending}
    >
      <FormError error={complete.error} />
    </ConfirmDialog>
  );
}

/** The order's status and the moves the server allows from it. */
export function OrderStatusCard({
  order,
  canManage,
}: {
  order: AdminOrderDetail;
  canManage: boolean;
}) {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const close = () => setDialog(null);
  const moves = canManage ? order.allowedNextStatuses : [];

  return (
    <DetailCard title="Status">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={order.status} />
        {order.cancelReason ? (
          <p className="text-sm text-muted-foreground">
            “{order.cancelReason}”
          </p>
        ) : null}
      </div>

      {moves.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {moves.map((move) => (
            <button
              key={move}
              type="button"
              onClick={() => setDialog(MOVES[move].dialog)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                MOVES[move].danger
                  ? "border border-danger bg-white text-danger hover:bg-danger/5"
                  : "bg-foreground text-white hover:bg-foreground/90",
              )}
            >
              {MOVES[move].label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {canManage
            ? "No further moves from here."
            : "You can view this order but not change it."}
        </p>
      )}

      {order.delivery ? (
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
          <Fact label="Carrier">{order.delivery.carrier}</Fact>
          <Fact label="Tracking number">{order.delivery.trackingNumber}</Fact>
          {order.shippedAt ? (
            <Fact label="Shipped">
              {dateTimeFormat.format(new Date(order.shippedAt))}
            </Fact>
          ) : null}
          {order.completedAt ? (
            <Fact label="Completed">
              {dateTimeFormat.format(new Date(order.completedAt))}
            </Fact>
          ) : null}
        </dl>
      ) : null}
      {order.delivery && order.status === "in_delivery" && canManage ? (
        <button
          type="button"
          onClick={() => setDialog("tracking")}
          className="mt-2 text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          Change tracking
        </button>
      ) : null}

      {dialog === "ship" || dialog === "tracking" ? (
        <ShippingDialog order={order} mode={dialog} onClose={close} />
      ) : null}
      {dialog === "cancel" ? (
        <CancelDialog order={order} onClose={close} />
      ) : null}
      {dialog === "complete" ? (
        <CompleteDialog order={order} onClose={close} />
      ) : null}
    </DetailCard>
  );
}
