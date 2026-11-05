"use client";

import { useMutation } from "@tanstack/react-query";
import QRCode from "qrcode";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import {
  AdminField,
  SignInCodeInput,
  signInButtonClass,
} from "@/features/admin-auth/admin-auth-ui";
import {
  authenticatorCodeSchema,
  recoveryCodeSchema,
  adminFailureMessage,
} from "@/features/admin-auth/admin-auth-schema";
import {
  AdminAuthError,
  beginTwoFactorSetup,
  enableTwoFactor,
  verifyTwoFactor,
} from "@/features/admin-auth/admin-auth-service";

const linkButton =
  "text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

function StepHead({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <h1 className="text-[clamp(1.25rem,3.4dvh,1.5rem)] font-semibold text-foreground">
        {title}
      </h1>
      <p className="text-sm leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

/** Reads the first problem of a code form: a field message from the server, or a sentence for everything else. */
function failureText(error: unknown, field: string): string | null {
  if (error instanceof AdminAuthError) {
    if (
      error.code === "validation_failed" ||
      error.code === "invalid_credentials"
    ) {
      return (
        error.fields?.[field] ??
        error.serverMessage ??
        "That code is not right. Please try again."
      );
    }
  }
  return adminFailureMessage(error);
}

/**
 * Step two for a person who already has an authenticator: the 6-digit code,
 * or one of the recovery codes (each works once).
 */
export function VerifyStep({
  onDone,
  onBack,
}: {
  onDone: () => void;
  onBack: () => void;
}) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: verifyTwoFactor,
    onSuccess: onDone,
    onError: (error) =>
      setProblem(failureText(error, useRecovery ? "recoveryCode" : "code")),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setProblem(null);
    if (useRecovery) {
      const parsed = recoveryCodeSchema.safeParse(value);
      if (!parsed.success) return setProblem(parsed.error.issues[0].message);
      mutate({ recoveryCode: parsed.data });
    } else {
      const parsed = authenticatorCodeSchema.safeParse(value);
      if (!parsed.success) return setProblem(parsed.error.issues[0].message);
      mutate({ code: parsed.data });
    }
  }

  const busy = isPending || isSuccess;
  return (
    <div className="flex w-full flex-col gap-[clamp(1rem,3.2dvh,1.75rem)]">
      <StepHead
        title="Two-step verification"
        text={
          useRecovery
            ? "Enter one of the recovery codes you saved. Each code works only once."
            : "Open your authenticator app and enter the 6-digit code for Luzanika."
        }
      />
      <form
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-[clamp(0.75rem,2.4dvh,1.25rem)]"
      >
        <AdminField
          id="admin-code"
          label={useRecovery ? "Recovery code" : "Authentication code"}
          error={problem ?? undefined}
        >
          <SignInCodeInput
            id="admin-code"
            // Digits come up as a number pad on phones; recovery codes also have letters.
            inputMode={useRecovery ? "text" : "numeric"}
            autoComplete="one-time-code"
            autoFocus
            maxLength={useRecovery ? 30 : 7}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={Boolean(problem)}
            aria-describedby="admin-code-message"
          />
        </AdminField>
        <Button type="submit" disabled={busy} className={signInButtonClass}>
          {busy ? "Verifying…" : "Verify"}
        </Button>
      </form>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          className={linkButton}
          onClick={() => {
            setUseRecovery((current) => !current);
            setValue("");
            setProblem(null);
          }}
        >
          {useRecovery
            ? "Use the code from my app"
            : "Use a recovery code instead"}
        </button>
        <button type="button" className={linkButton} onClick={onBack}>
          Back to sign in
        </button>
      </div>
    </div>
  );
}

/** A new person links their phone: a QR code to scan (or a key to type), then the first code proves it worked. */
export function SetupStep({
  onDone,
  onBack,
}: {
  onDone: (recoveryCodes: string[]) => void;
  onBack: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const setup = useMutation({
    mutationFn: async () => {
      const answer = await beginTwoFactorSetup();
      setQr(
        await QRCode.toDataURL(answer.otpauthUrl, { margin: 1, width: 144 }),
      );
      return answer;
    },
  });
  // Asking again makes a new secret, so ask exactly once per visit (also under React's double run in development).
  const asked = useRef(false);
  const { mutate: beginSetup } = setup;
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    beginSetup();
  }, [beginSetup]);

  const enable = useMutation({
    mutationFn: enableTwoFactor,
    onSuccess: onDone,
    onError: (error) => setProblem(failureText(error, "code")),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setProblem(null);
    const parsed = authenticatorCodeSchema.safeParse(value);
    if (!parsed.success) return setProblem(parsed.error.issues[0].message);
    enable.mutate(parsed.data);
  }

  return (
    <div className="flex w-full flex-col gap-[clamp(0.75rem,2.4dvh,1.25rem)]">
      <StepHead
        title="Set up two-step verification"
        text="Scan the QR code with an authenticator app (Google Authenticator, Authy…), then enter the 6-digit code."
      />

      <div className="flex flex-col items-center gap-3">
        {qr ? (
          <Image
            src={qr}
            alt="QR code for your authenticator app"
            width={144}
            height={144}
            unoptimized
            className="rounded-lg bg-white p-2"
          />
        ) : setup.isError ? (
          <p role="alert" className="text-sm text-danger">
            {adminFailureMessage(setup.error)}{" "}
            <button
              type="button"
              className="underline"
              onClick={() => beginSetup()}
            >
              Try again
            </button>
          </p>
        ) : (
          <p role="status" className="py-12 text-sm text-muted-foreground">
            Preparing your QR code…
          </p>
        )}
        {setup.data ? (
          <p className="text-center text-xs text-muted-foreground">
            Can&apos;t scan it? Enter this key in the app instead:
            <br />
            <span className="font-mono text-sm break-all text-foreground select-all">
              {setup.data.secret}
            </span>
          </p>
        ) : null}
      </div>

      <form
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-[clamp(0.75rem,2.4dvh,1.25rem)]"
      >
        <AdminField
          id="admin-setup-code"
          label="Authentication code"
          error={problem ?? undefined}
        >
          <SignInCodeInput
            id="admin-setup-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={Boolean(problem)}
            aria-describedby="admin-setup-code-message"
          />
        </AdminField>
        <Button
          type="submit"
          disabled={enable.isPending || !setup.data}
          className={signInButtonClass}
        >
          {enable.isPending ? "Checking…" : "Turn on and sign in"}
        </Button>
      </form>
      <button
        type="button"
        className={`${linkButton} self-center`}
        onClick={onBack}
      >
        Back to sign in
      </button>
    </div>
  );
}

/** The recovery codes, shown only this once. Signing in continues after the person says they saved them. */
export function RecoveryCodesStep({
  codes,
  onContinue,
}: {
  codes: string[];
  onContinue: () => void;
}) {
  const [saved, setSaved] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      toast.success("Recovery codes copied");
    } catch {
      toast.error("Couldn't copy. Please write the codes down instead.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-[clamp(0.75rem,2.4dvh,1.25rem)]">
      <StepHead
        title="Save your recovery codes"
        text="If you lose your phone, each of these codes lets you sign in once. We show them only now, so keep them somewhere safe."
      />
      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-muted-foreground p-4 text-center font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="select-all">
            {code}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="secondary"
        onClick={() => void copy()}
        className={`${signInButtonClass} border-muted-foreground`}
      >
        Copy codes
      </Button>
      <label className="flex items-start gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={saved}
          onChange={(event) => setSaved(event.target.checked)}
          className="mt-1 size-4 accent-[#252525]"
        />
        I have saved my recovery codes
      </label>
      <Button
        type="button"
        disabled={!saved}
        onClick={onContinue}
        className={signInButtonClass}
      >
        Continue
      </Button>
    </div>
  );
}
