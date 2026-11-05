"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  AdminBrand,
  AdminField,
  SignInEmailInput,
  SignInPasswordInput,
  signInButtonClass,
} from "@/features/admin-auth/admin-auth-ui";
import {
  adminFailureMessage,
  adminLoginSchema,
  type AdminLoginValues,
} from "@/features/admin-auth/admin-auth-schema";
import {
  fetchAdminSession,
  loginStaff,
  type TwoFactorStep,
} from "@/features/admin-auth/admin-auth-service";
import { AdminLoginArt } from "@/features/admin-auth/admin-login-art";
import {
  RecoveryCodesStep,
  SetupStep,
  VerifyStep,
} from "@/features/admin-auth/admin-two-factor-steps";

/** Where signing in ends. */
const AFTER_SIGN_IN = "/admin";
export const ADMIN_SESSION_KEY = ["admin", "session"] as const;

type Step =
  | { kind: "password" }
  | { kind: "verify" }
  | { kind: "setup" }
  | { kind: "recovery"; codes: string[] };

const stepOf = (next: TwoFactorStep): Step => ({
  kind: next === "two_factor_setup" ? "setup" : "verify",
});

function PasswordStep({ onNext }: { onNext: (next: TwoFactorStep) => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: loginStaff,
    onSuccess: (next) => {
      // The page stays mounted in the background; don't keep the password in it.
      reset();
      onNext(next);
    },
  });
  const failure = error ? adminFailureMessage(error) : null;

  return (
    <div className="flex w-full flex-col gap-[clamp(1rem,3.2dvh,1.75rem)]">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="text-[clamp(1.25rem,3.4dvh,1.5rem)] font-semibold text-foreground">
          Welcome Back!
        </h1>
        <p className="text-sm leading-5 text-muted-foreground">
          Sign in to your admin account to manage your store.
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit((values) => mutate(values))}
        className="flex flex-col gap-[clamp(1rem,3.2dvh,1.75rem)]"
      >
        <div className="flex flex-col gap-[clamp(0.75rem,2.2dvh,1rem)]">
          <AdminField
            id="admin-email"
            label="Email"
            error={errors.email?.message}
          >
            <SignInEmailInput
              id="admin-email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby="admin-email-message"
              {...register("email")}
            />
          </AdminField>
          <div className="flex flex-col gap-2">
            <AdminField
              id="admin-password"
              label="Password"
              error={errors.password?.message}
            >
              <SignInPasswordInput
                id="admin-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby="admin-password-message"
                {...register("password")}
              />
            </AdminField>
            <Link
              href="/admin/forgot-password"
              className="self-end text-sm text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Forget password
            </Link>
          </div>
        </div>

        {failure ? (
          <p role="alert" className="-mt-2 text-sm text-danger">
            {failure}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={isPending}
          className={signInButtonClass}
        >
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

/**
 * The admin sign-in page: the form on the left, the dark panel on the right
 * (Figma "Admin Log In"). Signing in has two steps: email + password, then the
 * authenticator code (a new person first links their phone and saves their
 * recovery codes). A visitor who is already signed in, or half way through,
 * lands on the right step.
 */
export function AdminLoginView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // The step the person moved to themselves; until then it follows what the server says.
  const [chosen, setStep] = useState<Step | null>(null);

  const session = useQuery({
    queryKey: ADMIN_SESSION_KEY,
    queryFn: fetchAdminSession,
    retry: 1,
    staleTime: 0,
  });

  const data = session.data;
  const step: Step =
    chosen ??
    (data?.state === "pending" ? stepOf(data.next) : { kind: "password" });

  // Someone who arrives already signed in goes straight on.
  useEffect(() => {
    if (data?.state === "signed_in") router.replace(AFTER_SIGN_IN);
  }, [data, router]);

  const finish = () => {
    // Next.js keeps this page alive behind the next one: forget the step (and the recovery codes) so a later visit starts clean.
    setStep(null);
    void queryClient.invalidateQueries({ queryKey: ADMIN_SESSION_KEY });
    router.replace(AFTER_SIGN_IN);
  };
  const backToPassword = () => setStep({ kind: "password" });

  const checking = session.isPending || data?.state === "signed_in";

  return (
    // --admin-pad is the space around the page: it shrinks with the window height, and the dark panel is exactly as tall as what is left.
    <main
      style={{ "--admin-pad": "clamp(0.75rem, 2.4dvh, 2rem)" } as CSSProperties}
      className="min-h-dvh bg-white p-4 lg:grid lg:grid-cols-2 lg:gap-x-[var(--admin-pad)] lg:p-[var(--admin-pad)]"
    >
      <div className="flex flex-col lg:pl-[clamp(1rem,2.5vw,3rem)]">
        <AdminBrand className="py-1" />
        <div className="flex flex-1 items-center justify-center py-3">
          <div className="flex w-full max-w-[480px] items-center rounded-xl bg-panel px-6 py-8 sm:px-10 lg:py-[clamp(1.5rem,5dvh,3rem)]">
            {checking ? (
              <p
                role="status"
                className="w-full py-16 text-center text-sm text-muted-foreground"
              >
                Loading…
              </p>
            ) : step.kind === "password" ? (
              <PasswordStep onNext={(next) => setStep(stepOf(next))} />
            ) : step.kind === "verify" ? (
              <VerifyStep onDone={finish} onBack={backToPassword} />
            ) : step.kind === "setup" ? (
              <SetupStep
                onDone={(codes) => setStep({ kind: "recovery", codes })}
                onBack={backToPassword}
              />
            ) : (
              <RecoveryCodesStep codes={step.codes} onContinue={finish} />
            )}
          </div>
        </div>
      </div>

      <AdminLoginArt className="lg:sticky lg:top-[var(--admin-pad)] lg:h-[calc(100dvh-2*var(--admin-pad))] lg:self-start" />
    </main>
  );
}
