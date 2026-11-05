"use client";

import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Image from "next/image";
import { useState, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/utils/cn";

/*
 * Sizes here are deliberately small and follow the window height (dvh), so a
 * sign-in page fits a laptop screen, with or without Windows display scaling,
 * and never needs scrolling.
 */

/** The brand mark and name, top left of the sign-in page. */
export function AdminBrand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/images/admin/logo.png"
        alt=""
        width={32}
        height={32}
        className="h-7 w-auto"
      />
      <span className="font-heading text-xl font-semibold text-foreground">
        Luzanika
      </span>
    </div>
  );
}

/** The round mail badge on top of the "forgot password" and "new password" cards. */
export function AdminMailBadge() {
  return (
    <div className="rounded-full border border-muted-foreground p-2.5">
      <div className="flex size-10 items-center justify-center rounded-full border border-[#525252] bg-foreground text-white shadow-[0px_4px_8px_-5px_rgba(0,0,0,0.15),0px_0px_0px_1px_#e5e5e5]">
        <Mail aria-hidden className="size-[18px]" strokeWidth={1.5} />
      </div>
    </div>
  );
}

/** The centred cream card of the "forgot password" and "new password" pages. */
export function AdminCenteredCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-4 py-6">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-[clamp(0.875rem,2.6dvh,1.5rem)] rounded-xl border border-border bg-panel p-[clamp(1.25rem,3.6dvh,2rem)] drop-shadow-[0px_16px_12px_rgba(93,106,131,0.02)]">
        {children}
      </div>
    </main>
  );
}

/** Title and sentence under the badge of a centred card. */
export function AdminCardHead({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-2 text-center">
      <h1 className="text-[clamp(1.25rem,3.6dvh,1.625rem)] leading-tight font-medium tracking-[-0.4px] text-[#0a0a0a]">
        {title}
      </h1>
      <p className="text-sm leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

/** Label, control and message, the way the admin pages show them. */
export function AdminField({
  id,
  label,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="text-[13px] leading-5 font-medium text-foreground"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-message`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Input of the sign-in card: transparent, grey border, an icon on the left. */
const signInInputClass =
  "h-11 w-full rounded-lg border border-muted-foreground bg-transparent pr-11 pl-11 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-danger";

/** Input of the centred cards: white, light border, rounded. */
export const cardInputClass =
  "h-11 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-danger";

function SignInInput({
  icon,
  trailing,
  className,
  ...props
}: ComponentProps<"input"> & { icon: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted-foreground"
      >
        {icon}
      </span>
      <input className={cn(signInInputClass, className)} {...props} />
      {trailing}
    </div>
  );
}

export function SignInEmailInput(props: ComponentProps<"input">) {
  return (
    <SignInInput
      type="email"
      autoComplete="username"
      placeholder="Enter Your Email"
      icon={<Mail className="size-[18px]" strokeWidth={1.5} />}
      {...props}
    />
  );
}

export function SignInPasswordInput(props: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);

  return (
    <SignInInput
      type={visible ? "text" : "password"}
      autoComplete="current-password"
      placeholder="Enter Your Password"
      icon={<Lock className="size-[18px]" strokeWidth={1.5} />}
      trailing={
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {visible ? (
            <EyeOff aria-hidden className="size-[18px]" strokeWidth={1.5} />
          ) : (
            <Eye aria-hidden className="size-[18px]" strokeWidth={1.5} />
          )}
        </button>
      }
      {...props}
    />
  );
}

/** A plain input for the code steps (no icon). */
export function SignInCodeInput(props: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        signInInputClass,
        "pl-3 text-center text-lg tracking-[0.3em]",
      )}
      {...props}
    />
  );
}

/** The dark button of the sign-in card. */
export const signInButtonClass =
  "h-11 w-full rounded-lg px-5 py-0 text-sm font-medium font-sans";

/** The pill button of the centred cards. */
export const cardButtonClass =
  "h-11 w-full rounded-full px-4 py-0 text-sm font-medium font-sans";

/** The grey underlined link under the button of a centred card. */
export const cardLinkClass =
  "text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";
