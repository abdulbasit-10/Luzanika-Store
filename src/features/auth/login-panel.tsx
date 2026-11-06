"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { EmailInput, PasswordInput } from "@/features/auth/auth-inputs";
import { loginSchema, type LoginFormValues } from "@/features/auth/auth-schema";
import { loginUser } from "@/features/auth/auth-service";
import { loginFailureMessage } from "@/features/auth/auth-messages";
import { SocialSignIn } from "@/features/auth/social-sign-in";
import {
  useRedirectWhenSignedIn,
  useNextPath,
} from "@/features/auth/use-redirect-when-signed-in";
import { useSignIn } from "@/features/auth/use-session";
import { withNextPath } from "@/features/auth/next-path";

export function LoginPanel() {
  const redirecting = useRedirectWhenSignedIn();
  const next = useNextPath();
  const signIn = useSignIn();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { mutate, isPending, isSuccess, error } = useMutation({
    mutationFn: loginUser,
    onSuccess: (user) => {
      toast.success(`Welcome back, ${user.firstName}!`);
      signIn(user);
      // The page stays mounted in the background after the redirect; don't keep the password in it.
      reset();
    },
  });

  if (redirecting) return null;

  const failure = error ? loginFailureMessage(error) : null;
  const busy = isPending || isSuccess;

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="text-[clamp(1.5rem,3.6dvh,1.875rem)] leading-tight font-medium">
        Get Started Now
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your credentials to access your account
      </p>

      <div className="mt-[clamp(1rem,3dvh,1.75rem)]">
        <SocialSignIn />
      </div>

      {/* The faint "or" line of the Figma between the social buttons and the form. */}
      <div
        aria-hidden
        className="mt-[clamp(0.75rem,2.2dvh,1.25rem)] flex items-center gap-3 text-xs text-[#d0d5dd]"
      >
        <span className="h-px flex-1 bg-[#eaecf0]" />
        or
        <span className="h-px flex-1 bg-[#eaecf0]" />
      </div>

      <form
        noValidate
        onSubmit={handleSubmit((values) => mutate(values))}
        className="mt-[clamp(0.75rem,2.2dvh,1.25rem)] flex flex-col gap-[clamp(0.75rem,2dvh,1.25rem)]"
      >
        <Field id="login-email" label="Email" error={errors.email?.message}>
          <EmailInput
            id="login-email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby="login-email-message"
            {...register("email")}
          />
        </Field>

        <div>
          <Field
            id="login-password"
            label="Password"
            error={errors.password?.message}
          >
            <PasswordInput
              id="login-password"
              placeholder="Your password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="login-password-message"
              {...register("password")}
            />
          </Field>
          <Link
            href="/forgot-password"
            className="mt-1.5 inline-block text-[11px] text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            Forgot password?
          </Link>
        </div>

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
          {busy ? "Logging in…" : "Login"}
        </Button>
      </form>

      <p className="mt-[clamp(1.25rem,4dvh,2.5rem)] text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href={withNextPath("/signup", next)}
          className="font-medium text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Sign Up
        </Link>
      </p>
    </div>
  );
}
