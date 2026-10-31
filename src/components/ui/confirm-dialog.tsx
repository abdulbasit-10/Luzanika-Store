"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** Button text while the action runs. */
  pendingLabel?: string;
  /** Disables the buttons and blocks closing while the action runs. */
  pending?: boolean;
}

/** Modal that asks before a destructive action. Uses the native <dialog>, so it traps focus and closes on Escape. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  pendingLabel = "Working…",
  pending,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onClose={onClose}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-[420px] rounded-xl bg-white p-6 text-foreground shadow-overlay backdrop:bg-black/50"
    >
      <h2
        id="confirm-dialog-title"
        className="font-heading text-xl font-medium"
      >
        {title}
      </h2>
      <p
        id="confirm-dialog-description"
        className="mt-2 text-sm text-muted-foreground"
      >
        {description}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={onClose}
          className="rounded-md px-4 py-2.5"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={onConfirm}
          className="rounded-md bg-danger px-4 py-2.5 text-white hover:bg-danger/90"
        >
          {pending ? pendingLabel : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
