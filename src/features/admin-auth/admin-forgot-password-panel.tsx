"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import Link from "next/link";
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
  adminForgotPasswordSchema,
  type AdminForgotPasswordValues,
} from "@/features/admin-auth/admin-auth-schema";
import { requestStaffPasswordReset } from "@/features/admin-auth/admin-auth-service";

/** "Need help with your account?": the email address to send the reset link to (Figma "Forgot Password"). */
export function AdminForgotPasswordPanel() {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<AdminForgotPasswordValues>({
    resolver: zodResolver(adminForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: (values: AdminForgotPasswordValues) =>
      requestStaffPasswordReset(values.email),
  });

  // The server answers the same whether or not the address belongs to staff, so this page says so too.
  if (isSuccess) {
    return (
      <AdminCenteredCard>
        <AdminMailBadge />
        <AdminCardHead
          title="Check your email"
          text={`If ${getValues("email")} belongs to a Luzanika admin account, we have sent a link to reset the password. It works for 30 minutes.`}
        />
        <Link href="/admin/login" className={cardLinkClass}>
          Back to Login
        </Link>
      </AdminCenteredCard>
    );
  }

  const failure = error ? adminFailureMessage(error) : null;

  return (
    <AdminCenteredCard>
      <AdminMailBadge />
      <AdminCardHead
        title="Need help with your account?"
        text="Enter the email address associated with your account and we will send you a link to reset your password."
      />

      <form
        noValidate
        onSubmit={handleSubmit((values) => mutate(values))}
        className="flex w-full flex-col gap-8"
      >
        <AdminField
          id="admin-forgot-email"
          label="Email"
          error={errors.email?.message}
        >
          <div className="relative">
            <Mail
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-3 my-auto size-5 text-muted-foreground"
              strokeWidth={1.5}
            />
            <input
              id="admin-forgot-email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby="admin-forgot-email-message"
              className={`${cardInputClass} pl-11`}
              {...register("email")}
            />
          </div>
        </AdminField>

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
            {isPending ? "Sending…" : "Send Link"}
          </Button>
          <Link href="/admin/login" className={cardLinkClass}>
            Back to Login
          </Link>
        </div>
      </form>
    </AdminCenteredCard>
  );
}
