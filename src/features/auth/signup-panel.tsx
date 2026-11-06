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
import { signupFailureMessage } from "@/features/auth/auth-messages";
import { withNextPath } from "@/features/auth/next-path";
import { SocialSignIn } from "@/features/auth/social-sign-in";
import {
  useNextPath,
  useRedirectWhenSignedIn,
} from "@/features/auth/use-redirect-when-signed-in";
import { useSignIn } from "@/features/auth/use-session";

/** The Figma inputs are white with a light grey outline on the cream card. */
const inputOutline = "border border-[#d7d7d7]";

export function SignupPanel() {
  const redirecting = useRedirectWhenSignedIn();
  const next = useNextPath();
  const signIn = useSignIn();
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
      signIn(user);
      // The page stays mounted in the background after the redirect; don't keep the password in it.
      reset();
    },
    onError: (failure) => {
      if (!(failure instanceof AuthError)) return;
      // Show each problem next to the field it belongs to.
      for (const [field, message] of Object.entries(failure.fields ?? {})) {
        if (field in signupSchema.shape) {
          setError(field as keyof SignupFormValues, {
            type: "server",
            message,
          });
        }
      }
    },
  });

  if (redirecting) return null;

  const failure = error ? signupFailureMessage(error) : null;
  const busy = isPending || isSuccess;

  return (
    <div className="w-full max-w-[540px] rounded-2xl bg-section px-[clamp(1.25rem,6vw,3.25rem)] py-[clamp(0.875rem,3dvh,2.25rem)]">
      <div className="text-center">
        <h1 className="text-[clamp(1.375rem,3.2dvh,1.75rem)] leading-tight font-semibold">
          Create New Account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join Luzanika and discover your style.
        </p>
      </div>

      <div className="mt-[clamp(0.75rem,2.4dvh,1.5rem)]">
        <SocialSignIn outlined />
      </div>
      <div
        aria-hidden
        className="mt-[clamp(0.625rem,1.8dvh,1.125rem)] flex items-center gap-3 text-xs text-muted-foreground"
      >
        <span className="h-px flex-1 bg-[#d7d7d7]" />
        or
        <span className="h-px flex-1 bg-[#d7d7d7]" />
      </div>

      <form
        noValidate
        onSubmit={handleSubmit(({ confirmPassword, ...values }) => {
          void confirmPassword;
          mutate(values);
        })}
        className="mt-[clamp(0.5rem,1.4dvh,1rem)] flex flex-col gap-[clamp(0.5rem,1.5dvh,1rem)]"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="signup-first-name"
            label="First Name"
            labelClassName="text-sm"
            error={errors.firstName?.message}
          >
            <AuthInput
              id="signup-first-name"
              className={inputOutline}
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
            labelClassName="text-sm"
            error={errors.lastName?.message}
          >
            <AuthInput
              id="signup-last-name"
              className={inputOutline}
              placeholder="Name"
              autoComplete="family-name"
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby="signup-last-name-message"
              {...register("lastName")}
            />
          </Field>
        </div>

        <Field
          id="signup-email"
          label="Email"
          labelClassName="text-sm"
          error={errors.email?.message}
        >
          <EmailInput
            id="signup-email"
            className={inputOutline}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="signup-email-message"
            {...register("email")}
          />
        </Field>

        <Field
          id="signup-password"
          label="Password"
          labelClassName="text-sm"
          error={errors.password?.message}
        >
          <PasswordInput
            id="signup-password"
            className={inputOutline}
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
          labelClassName="text-sm"
          error={errors.confirmPassword?.message}
        >
          <PasswordInput
            id="signup-confirm-password"
            className={inputOutline}
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

      <p className="mt-[clamp(0.75rem,2.2dvh,1.5rem)] text-center text-xs text-muted-foreground">
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
