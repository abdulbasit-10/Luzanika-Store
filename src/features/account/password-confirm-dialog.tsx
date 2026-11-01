"use client";

import { useId, useState, type ReactNode } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PasswordInput } from "@/features/auth/auth-inputs";

interface PasswordConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the password the visitor typed. */
  onConfirm: (password: string) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  /** Shown under the password field, e.g. "Your current password is incorrect". */
  error?: string | null;
  illustration?: ReactNode;
}

/**
 * Asks for the current password before something sensitive (changing the
 * email, deleting the account). The field is emptied every time the dialog
 * opens or closes, so a password never lingers in the page.
 */
export function PasswordConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  pendingLabel,
  pending,
  error,
  illustration,
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  // The dialog stays mounted while closed, so start empty each time it closes.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setPassword("");
  }

  function submit() {
    if (password && !pending) onConfirm(password);
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={submit}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      pendingLabel={pendingLabel}
      pending={pending}
      confirmDisabled={!password}
      illustration={illustration}
    >
      <label htmlFor={fieldId} className="text-xs font-medium">
        Current password
      </label>
      <div className="mt-1.5">
        <PasswordInput
          id={fieldId}
          value={password}
          autoComplete="current-password"
          placeholder="Your password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          className="border border-black/15"
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </ConfirmDialog>
  );
}
