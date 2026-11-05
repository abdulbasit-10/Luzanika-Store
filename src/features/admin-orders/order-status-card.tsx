"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/utils/cn";

import {
  changeOrderStatus,
  type AdminOrderDetail,
  type StaffTargetStatus,
} from "./order-detail-service";
import {
  DetailCard,
  Fact,
  Field,
  FormError,
  dateTimeFormat,
  inputClass,
  useOrderMutation,
} from "./order-detail-ui";
import { StatusChip } from "./status-chip";

type DialogKind = "ship" | "complete" | "cancel";

const MOVES: Record<
  StaffTargetStatus,
  { label: string; dialog: DialogKind; danger?: boolean }
> = {
  in_delivery: { label: "Mark as shipped", dialog: "ship" },
  completed: { label: "Mark as delivered", dialog: "complete" },
  cancelled: { label: "Cancel order", dialog: "cancel", danger: true },
};

function ShipDialog({
  order,
  onClose,
}: {
  order: AdminOrderDetail;
  onClose: () => void;
}) {
  const ship = useOrderMutation(
    order.number,
    () => changeOrderStatus(order.number, { status: "in_delivery" }),
    "Order is now shipped",
    onClose,
  );

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => ship.mutate()}
      title={`Mark ${order.number} as shipped?`}
      description="Use this once the parcel has been handed to the courier. The customer is emailed."
      confirmLabel="Mark as shipped"
      pendingLabel="Saving…"
      pending={ship.isPending}
    >
      <FormError error={ship.error} />
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
    "Order delivered",
    onClose,
  );

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => complete.mutate()}
      title={`Mark ${order.number} as delivered?`}
      description="Use this once the parcel has arrived. The order is then locked. The customer is emailed."
      confirmLabel="Mark as delivered"
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
          {!canManage
            ? "You can view this order but not change it."
            : order.deletedAt
              ? "This order was deleted from the order list."
              : order.status === "completed"
                ? "This order is delivered and locked."
                : "No further moves from here."}
        </p>
      )}

      {order.shippedAt || order.completedAt ? (
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
          {order.shippedAt ? (
            <Fact label="Shipped">
              {dateTimeFormat.format(new Date(order.shippedAt))}
            </Fact>
          ) : null}
          {order.completedAt ? (
            <Fact label="Delivered">
              {dateTimeFormat.format(new Date(order.completedAt))}
            </Fact>
          ) : null}
        </dl>
      ) : null}

      {dialog === "ship" ? <ShipDialog order={order} onClose={close} /> : null}
      {dialog === "cancel" ? (
        <CancelDialog order={order} onClose={close} />
      ) : null}
      {dialog === "complete" ? (
        <CompleteDialog order={order} onClose={close} />
      ) : null}
    </DetailCard>
  );
}
