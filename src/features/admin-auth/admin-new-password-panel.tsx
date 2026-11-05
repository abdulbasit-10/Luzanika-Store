"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  AdminCardHead,
  AdminCenteredCard,
  AdminField,
  AdminMailBadge,
  cardButtonClass,
  cardInputClass,
  cardLinkClass,
} from "@/features/admin-auth/admin-auth-ui";
import {
  adminFailureMessage,
  adminNewPasswordSchema,
  type AdminNewPasswordValues,
} from "@/features/admin-auth/admin-auth-schema";
import {
  AdminAuthError,
  setStaffPassword,
} from "@/features/admin-auth/admin-auth-service";

const TEXT = {
  reset: {
    title: "Create New Password",
    text: "Choose a strong password for your admin account.",
    button: "Reset Password",
    done: "Your password has been changed. You were signed out everywhere, so please sign in with the new one.",
  },
  invite: {
    title: "Welcome to Luzanika",
    text: "Choose a password for your admin account. You will set up two-step verification when you sign in.",
    button: "Save Password",
    done: "Your password is saved. You can now sign in.",
  },
} as const;

/**
 * "Create New Password" (Figma): the page behind the link in the reset email
 * (`kind="reset"`) and in the invite email (`kind="invite"`). Both carry a
 * token in the address and set a password, so they share this page.
 */
export function AdminNewPasswordPanel({ kind }: { kind: "reset" | "invite" }) {
  const token = useSearchParams().get("token");
  const copy = TEXT[kind];
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AdminNewPasswordValues>({
    resolver: zodResolver(adminNewPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: (values: AdminNewPasswordValues) =>
      setStaffPassword(kind, { token: token ?? "", password: values.password }),
    // The page stays mounted in the background; don't keep the password in it.
    onSuccess: () => reset(),
    onError: (failure) => {
      const message =
        failure instanceof AdminAuthError
          ? failure.fields?.password
          : undefined;
      if (message) setError("password", { type: "server", message });
    },
  });

  if (isSuccess) {
    return (
      <AdminCenteredCard>
        <AdminMailBadge />
        <AdminCardHead title="Password updated" text={copy.done} />
        <Link
          href="/admin/login"
          className={`${cardButtonClass} inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90`}
        >
          Go to Login
        </Link>
      </AdminCenteredCard>
    );
  }

  const linkProblem =
    !token ||
    (error instanceof AdminAuthError && error.code === "invalid_reset_link");
  if (linkProblem) {
    return (
      <AdminCenteredCard>
        <AdminMailBadge />
        <AdminCardHead
          title="This link has expired"
          text="This link is invalid, already used, or has expired. Request a new one and we will email it to you."
        />
        <Link href="/admin/forgot-password" className={cardLinkClass}>
          Request a new link
        </Link>
      </AdminCenteredCard>
    );
  }

  const failure = error ? adminFailureMessage(error) : null;

  return (
    <AdminCenteredCard>
      <AdminMailBadge />
      <AdminCardHead title={copy.title} text={copy.text} />

      <form
        noValidate
        onSubmit={handleSubmit((values) => mutate(values))}
        className="flex w-full flex-col gap-8"
      >
        <div className="flex flex-col gap-8">
          <AdminField
            id="admin-new-password"
            label="New Password"
            error={errors.password?.message}
          >
            <input
              id="admin-new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter your new password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="admin-new-password-message"
              className={cardInputClass}
              {...register("password")}
            />
          </AdminField>
          <AdminField
            id="admin-confirm-password"
            label="Confirm Password"
            error={errors.confirmPassword?.message}
          >
            <input
              id="admin-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter new password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby="admin-confirm-password-message"
              className={cardInputClass}
              {...register("confirmPassword")}
            />
          </AdminField>
        </div>

        {failure ? (
          <p role="alert" className="-mt-4 text-sm text-danger">
            {failure}
          </p>
        ) : null}

        <div className="flex flex-col items-center gap-6">
          <Button
            type="submit"
            disabled={isPending}
            className={cardButtonClass}
          >
            {isPending ? "Saving…" : copy.button}
          </Button>
          <Link href="/admin/login" className={cardLinkClass}>
            Back to Login
          </Link>
        </div>
      </form>
    </AdminCenteredCard>
  );
}
