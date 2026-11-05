"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { useAdminSession } from "@/features/admin-shell/admin-session";
import { cn } from "@/utils/cn";

import {
  applyOrderMove,
  type AdminOrderListItem,
  type AdminOrderMove,
} from "./admin-orders-service";
import { FormError, Field, inputClass } from "./order-detail-ui";
import { ORDER_MOVE_LABEL } from "./orders-labels";
import { StatusChip } from "./status-chip";

const DIALOG: Record<
  AdminOrderMove,
  { title: (number: string) => string; description: string; done: string }
> = {
  processing: {
    title: (number) => `Confirm the payment of ${number}?`,
    description:
      "This says the money arrived. The order moves to Processing and the customer is emailed.",
    done: "Payment confirmed, order is processing",
  },
  in_delivery: {
    title: (number) => `Mark ${number} as shipped?`,
    description:
      "Use this once the parcel has been handed to the courier. The customer is emailed. You cannot go back.",
    done: "Order shipped",
  },
  completed: {
    title: (number) => `Mark ${number} as delivered?`,
    description:
      "Use this once the parcel has arrived. The customer is emailed and the order is locked: its status can no longer be changed.",
    done: "Order delivered",
  },
  cancelled: {
    title: (number) => `Cancel order ${number}?`,
    description:
      "The goods go back into stock and the customer is emailed. This cannot be undone.",
    done: "Order cancelled",
  },
  deleted: {
    title: (number) => `Delete order ${number}?`,
    description:
      "The order disappears from the order list. The record, its payments and the audit log are kept. This cannot be undone.",
    done: "Order deleted",
  },
};

/**
 * The status of an order row as a dropdown. It offers only the moves the server
 * allows, so an order never goes back; a locked order (delivered, refunded,
 * deleted) is a plain chip. Every move asks first.
 */
export function OrderStatusDropdown({ order }: { order: AdminOrderListItem }) {
  const { staff, permissions } = useAdminSession();
  const can = (permission: string) =>
    staff.isSuperAdmin || permissions.includes(permission);

  // Confirming a payment is a payments permission; everything else is orders.manage.
  const moves = order.allowedMoves.filter((move) =>
    move === "processing" ? can("payments.verify") : can("orders.manage"),
  );

  const [position, setPosition] = useState<{ top: number; left: number }>();
  const [chosen, setChosen] = useState<AdminOrderMove | null>(null);
  const [reason, setReason] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = position !== undefined;
  const queryClient = useQueryClient();

  const apply = useMutation({
    mutationFn: (move: AdminOrderMove) =>
      applyOrderMove(order.number, move, reason.trim() || undefined),
    onSuccess: async (_, move) => {
      toast.success(DIALOG[move].done);
      setChosen(null);
      setReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "order", order.number],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
      ]);
    },
  });

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(undefined);
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        close();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  if (moves.length === 0) {
    const delivered = order.status === "completed" && !order.deleted;
    return (
      <span
        className="inline-flex items-center gap-1.5"
        title={
          delivered
            ? "Delivered: this order is locked"
            : order.deleted
              ? "Deleted"
              : undefined
        }
      >
        <StatusChip status={order.status} deleted={order.deleted} />
        {delivered ? (
          <Lock aria-label="Locked" className="size-3.5 text-[#737373]" />
        ) : null}
      </span>
    );
  }

  function toggle() {
    if (open) return setPosition(undefined);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 4, left: rect.left });
  }

  function choose(move: AdminOrderMove) {
    setPosition(undefined);
    setReason("");
    apply.reset();
    setChosen(move);
  }

  const dialog = chosen ? DIALOG[chosen] : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Change status of order ${order.number}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="inline-flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <StatusChip status={order.status} deleted={order.deleted}>
          <ChevronDown
            aria-hidden
            className={cn("size-3 transition-transform", open && "rotate-180")}
          />
        </StatusChip>
      </button>
      {position ? (
        <div
          ref={panelRef}
          role="menu"
          style={{ top: position.top, left: position.left }}
          className="fixed z-50 min-w-44 rounded-lg bg-surface py-1.5 shadow-overlay"
        >
          {moves.map((move) => (
            <button
              key={move}
              type="button"
              role="menuitem"
              onClick={() => choose(move)}
              className={cn(
                "block w-full px-4 py-2 text-left text-sm whitespace-nowrap hover:bg-muted",
                (move === "cancelled" || move === "deleted") && "text-danger",
              )}
            >
              {ORDER_MOVE_LABEL[move]}
            </button>
          ))}
        </div>
      ) : null}
      {chosen && dialog ? (
        <ConfirmDialog
          open
          onClose={() => setChosen(null)}
          onConfirm={() => apply.mutate(chosen)}
          title={dialog.title(order.number)}
          description={dialog.description}
          confirmLabel={ORDER_MOVE_LABEL[chosen]}
          pendingLabel="Saving…"
          pending={apply.isPending}
        >
          {chosen === "cancelled" ? (
            <Field
              id={`cancel-reason-${order.number}`}
              label="Reason (optional)"
            >
              <textarea
                id={`cancel-reason-${order.number}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={200}
                rows={2}
                className={cn(inputClass, "h-auto py-2")}
              />
            </Field>
          ) : null}
          <FormError error={apply.error} />
        </ConfirmDialog>
      ) : null}
    </>
  );
}
