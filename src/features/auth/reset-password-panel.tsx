"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { ButtonLink, Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/features/auth/auth-inputs";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/features/auth/auth-schema";
import { AuthError, resetPassword } from "@/features/auth/auth-service";
import { ForgotPasswordIllustration } from "@/features/auth/forgot-password-illustration";

export function ResetPasswordPanel() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: resetPassword,
    // The page stays mounted in the background; don't keep the password in it.
    onSuccess: () => reset(),
  });

  if (isSuccess) {
    return (
      <div className="w-full max-w-[400px] text-center">
        <h1 className="text-[clamp(1.25rem,3dvh,1.5rem)] leading-tight font-semibold">
          Password updated
        </h1>
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Your password has been reset. You can now log in with your new
          password.
        </p>
        <ButtonLink
          href="/login"
          className="mt-6 h-11 w-full rounded-md text-sm"
        >
          Go to login
        </ButtonLink>
      </div>
    );
  }

  const failure = error
    ? error instanceof AuthError
      ? "This reset link is invalid or has expired."
      : "Something went wrong. Please try again."
    : null;

  return (
    <div className="w-full max-w-[400px]">
      <ForgotPasswordIllustration className="mx-auto h-[clamp(6rem,21dvh,11rem)] w-auto" />

      <div className="mt-[clamp(0.5rem,2dvh,1.25rem)] text-center">
        <h1 className="text-[clamp(1.25rem,3dvh,1.5rem)] leading-tight font-semibold">
          Forgot Password?
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter your new password to keep it safe
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit(({ password }) => mutate({ password }))}
        className="mt-[clamp(0.75rem,2.4dvh,1.5rem)] flex flex-col gap-[clamp(0.625rem,1.8dvh,1.125rem)]"
      >
        <Field
          id="reset-password"
          label="New password"
          error={errors.password?.message}
        >
          <PasswordInput
            id="reset-password"
            placeholder="Password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby="reset-password-message"
            {...register("password")}
          />
        </Field>

        <Field
          id="reset-confirm-password"
          label="Confirm Password"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="reset-confirm-password"
            placeholder="Password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby="reset-confirm-password-message"
            {...register("confirmPassword")}
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
          {isPending ? "Resetting…" : "Reset password"}
        </Button>
      </form>

      <p className="mt-[clamp(1rem,3.5dvh,2.25rem)] text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Sign Up
        </Link>
      </p>
    </div>
  );
}
