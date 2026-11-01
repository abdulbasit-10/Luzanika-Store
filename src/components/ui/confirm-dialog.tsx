"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

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
  /** Keeps the confirm button off until the dialog's own content (e.g. a password) is filled in. */
  confirmDisabled?: boolean;
  /** Decorative picture above the title. */
  illustration?: ReactNode;
  /** Extra content between the description and the buttons, such as a password field. */
  children?: ReactNode;
}

/** Centered modal that asks before an action that cannot be undone. Uses the native <dialog>, so it traps focus and closes on Escape. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  pendingLabel = "Working…",
  pending,
  confirmDisabled,
  illustration,
  children,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
      // A click on the backdrop lands on the dialog itself, not on its content.
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-[480px] rounded-2xl bg-white px-6 py-[clamp(1rem,3dvh,2rem)] text-center text-foreground shadow-overlay backdrop:bg-black/50 sm:px-10"
    >
      {illustration ? (
        <div aria-hidden className="flex justify-center">
          {illustration}
        </div>
      ) : null}
      <h2
        id={titleId}
        className="mt-[clamp(0.5rem,2dvh,1.25rem)] text-lg font-semibold"
      >
        {title}
      </h2>
      <p id={descriptionId} className="mt-1.5 text-xs text-muted-foreground">
        {description}
      </p>
      {children ? <div className="mt-4 text-left">{children}</div> : null}
      <div className="mt-[clamp(0.75rem,2.6dvh,1.5rem)] flex justify-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={onClose}
          className="h-9 min-w-24 rounded-md border-black/15 px-5 py-0 text-xs font-medium"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={pending || confirmDisabled}
          onClick={onConfirm}
          className="h-9 min-w-24 rounded-md px-5 py-0 text-xs font-medium"
        >
          {pending ? pendingLabel : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
