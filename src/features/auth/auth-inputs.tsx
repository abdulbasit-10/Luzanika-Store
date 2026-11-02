"use client";

import { Eye, EyeOff, Mail } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/utils/cn";

/** Look of the text inputs on the login and sign-up pages (white on the grey page). */
export const authInputClass =
  "h-10 w-full rounded-md bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:outline-2 aria-invalid:outline-danger";

function AuthTextInput({
  trailing,
  className,
  ...props
}: ComponentProps<"input"> & { trailing?: ReactNode }) {
  return (
    <div className="relative">
      <input
        className={cn(
          authInputClass,
          trailing ? "pr-10" : undefined,
          className,
        )}
        {...props}
      />
      {trailing}
    </div>
  );
}

export function AuthInput({ className, ...props }: ComponentProps<"input">) {
  return <AuthTextInput className={className} {...props} />;
}

export function EmailInput(props: ComponentProps<"input">) {
  return (
    <AuthTextInput
      type="email"
      autoComplete="email"
      placeholder="Your email"
      trailing={
        <Mail
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground"
        />
      }
      {...props}
    />
  );
}

export function PasswordInput(props: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthTextInput
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {visible ? (
            <EyeOff aria-hidden className="size-4" />
          ) : (
            <Eye aria-hidden className="size-4" />
          )}
        </button>
      }
      {...props}
    />
  );
}
