"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import {
  AuthInput,
  EmailInput,
  PasswordInput,
} from "@/features/auth/auth-inputs";
import {
  signupSchema,
  type SignupFormValues,
} from "@/features/auth/auth-schema";
import { AuthError, registerUser } from "@/features/auth/auth-service";
import { withNextPath } from "@/features/auth/next-path";
import { SocialSignIn } from "@/features/auth/social-sign-in";
import {
  useNextPath,
  useRedirectWhenSignedIn,
} from "@/features/auth/use-redirect-when-signed-in";
import { useAuthStore } from "@/stores/auth-store";

export function SignupPanel() {
  const redirecting = useRedirectWhenSignedIn();
  const next = useNextPath();
  const setUser = useAuthStore((state) => state.setUser);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: registerUser,
    onSuccess: (user) => {
      toast.success(`Account created. Welcome, ${user.firstName}!`);
      setUser(user);
      // The page stays mounted in the background after the redirect; don't keep the password in it.
      reset();
    },
    onError: (failure) => {
      if (failure instanceof AuthError && failure.code === "email_taken") {
        setError("email", {
          type: "server",
          message: "An account with this email already exists",
        });
      }
    },
  });

  if (redirecting) return null;

  const failure =
    error && !(error instanceof AuthError)
      ? "Something went wrong. Please try again."
      : null;
  const busy = isPending || isSuccess;

  return (
    <div className="w-full max-w-[400px]">
      <div className="text-center">
        <h1 className="text-[clamp(1.375rem,3.2dvh,1.75rem)] leading-tight font-semibold">
          Create New Account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join Luzanika and discover your style.
        </p>
      </div>

      <div className="mt-[clamp(0.875rem,2.6dvh,1.5rem)]">
        <SocialSignIn />
      </div>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">or</p>

      <form
        noValidate
        onSubmit={handleSubmit(({ confirmPassword, ...values }) => {
          void confirmPassword;
          mutate(values);
        })}
        className="mt-[clamp(0.5rem,1.6dvh,1rem)] flex flex-col gap-[clamp(0.625rem,1.8dvh,1.125rem)]"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="signup-first-name"
            label="First Name"
            error={errors.firstName?.message}
          >
            <AuthInput
              id="signup-first-name"
              placeholder="Name"
              autoComplete="given-name"
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby="signup-first-name-message"
              {...register("firstName")}
            />
          </Field>
          <Field
            id="signup-last-name"
            label="Last Name"
            error={errors.lastName?.message}
          >
            <AuthInput
              id="signup-last-name"
              placeholder="Name"
              autoComplete="family-name"
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby="signup-last-name-message"
              {...register("lastName")}
            />
          </Field>
        </div>

        <Field id="signup-email" label="Email" error={errors.email?.message}>
          <EmailInput
            id="signup-email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby="signup-email-message"
            {...register("email")}
          />
        </Field>

        <Field
          id="signup-password"
          label="Password"
          error={errors.password?.message}
        >
          <PasswordInput
            id="signup-password"
            placeholder="Your password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby="signup-password-message"
            {...register("password")}
          />
        </Field>

        <Field
          id="signup-confirm-password"
          label="Confirm Password"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="signup-confirm-password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby="signup-confirm-password-message"
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
          disabled={busy}
          className="h-11 w-full rounded-md text-sm"
        >
          {busy ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <p className="mt-[clamp(1rem,3dvh,2rem)] text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={withNextPath("/login", next)}
          className="font-medium text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Login
        </Link>
      </p>
    </div>
  );
}
