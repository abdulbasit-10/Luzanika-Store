"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";

import { Field, fieldControlClass } from "@/components/ui/field";
import type { CheckoutFormValues } from "@/features/checkout/checkout-schema";
import { cn } from "@/utils/cn";

export const cardClass = "rounded-xl bg-panel p-4";

const tabs = [
  { id: "guest", label: "Guest Checkout" },
  { id: "google", label: "Sign In with Gmail ID" },
] as const;

type TabId = (typeof tabs)[number]["id"];

/**
 * Who is checking out. Guest checkout is the working path. The Google sign-in
 * tab is shown as designed but not connected yet: accounts come with the
 * backend, so selecting it only explains that and the fields below still work.
 */
export function ContactCard() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CheckoutFormValues>();
  const [tab, setTab] = useState<TabId>("guest");

  return (
    <section aria-label="Contact details" className={cardClass}>
      <div
        role="group"
        aria-label="Checkout method"
        className="grid grid-cols-2 gap-1 rounded-lg bg-white p-1"
      >
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "h-8 cursor-pointer rounded-md px-3 font-button text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              tab === id
                ? "bg-primary text-primary-foreground"
                : "text-navy hover:bg-black/5",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "google" ? (
        <p role="status" className="mt-2.5 text-xs text-muted-foreground">
          Signing in with Google will be available once accounts are connected.
          You can check out as a guest below.
        </p>
      ) : null}

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        <Field
          id="checkout-email"
          label="Email Address for Confirmation"
          required
          hint="We will send your order confirmation here."
          error={errors.email?.message}
        >
          <input
            id="checkout-email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby="checkout-email-message"
            className={fieldControlClass}
            {...register("email")}
          />
        </Field>
        <Field
          id="checkout-phone"
          label="Phone Number"
          required
          hint="For SMS dispatch updates & courier confirmation."
          error={errors.phone?.message}
        >
          <input
            id="checkout-phone"
            type="tel"
            autoComplete="tel"
            placeholder="0300 4589211"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby="checkout-phone-message"
            className={fieldControlClass}
            {...register("phone")}
          />
        </Field>
      </div>
    </section>
  );
}
