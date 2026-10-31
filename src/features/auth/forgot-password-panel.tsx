"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { EmailInput } from "@/features/auth/auth-inputs";
import { forgotFailureMessage } from "@/features/auth/auth-messages";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/features/auth/auth-schema";
import { AuthError, requestPasswordReset } from "@/features/auth/auth-service";
import { ForgotPasswordIllustration } from "@/features/auth/forgot-password-illustration";

/*
 * Step one of resetting a password: the visitor enters the email they
 * registered with and we send a link there (which opens the "choose a new
 * password" page). An email with no account is refused with a message on the
 * email field.
 */
export function ForgotPasswordPanel() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const { mutate, isPending, isSuccess, error, variables } = useMutation({
    mutationFn: ({ email }: ForgotPasswordFormValues) =>
      requestPasswordReset(email),
    onError: (failure) => {
      if (
        failure instanceof AuthError &&
        failure.code === "email_not_registered"
      ) {
        setError("email", {
          type: "server",
          message:
            failure.fields?.email ?? "This email is not registered with us",
        });
      }
    },
  });

  if (isSuccess) {
    return (
      <div className="w-full max-w-[400px] text-center">
        <h1 className="text-[clamp(1.25rem,3dvh,1.5rem)] leading-tight font-semibold">
          Check your email
        </h1>
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          We have sent a link to reset your password to{" "}
          <span className="font-medium text-foreground">
            {variables?.email}
          </span>
          . It is valid for 30 minutes.
        </p>
        <ButtonLink
          href="/login"
          className="mt-6 h-11 w-full rounded-md text-sm"
        >
          Back to login
        </ButtonLink>
      </div>
    );
  }

  const failure = error ? forgotFailureMessage(error) : null;

  return (
    <div className="w-full max-w-[400px]">
      <ForgotPasswordIllustration className="mx-auto h-[clamp(6rem,21dvh,11rem)] w-auto" />

      <div className="mt-[clamp(0.5rem,2dvh,1.25rem)] text-center">
        <h1 className="text-[clamp(1.25rem,3dvh,1.5rem)] leading-tight font-semibold">
          Forgot Password?
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter your email and we will send you a link to reset it
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit((values) => mutate(values))}
        className="mt-[clamp(0.75rem,2.4dvh,1.5rem)] flex flex-col gap-[clamp(0.625rem,1.8dvh,1.125rem)]"
      >
        <Field id="forgot-email" label="Email" error={errors.email?.message}>
          <EmailInput
            id="forgot-email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby="forgot-email-message"
            {...register("email")}
          />
        </Field>

        {failure ? (
          <p role="alert" className="text-sm text-danger">
            {failure}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-md text-sm"
        >
          {isPending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-[clamp(1rem,3.5dvh,2.25rem)] text-center text-xs text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
