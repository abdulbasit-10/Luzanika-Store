"use client";

import { useFormContext } from "react-hook-form";

import { Field, fieldControlClass } from "@/components/ui/field";
import type { CheckoutFormValues } from "@/features/checkout/checkout-schema";

export const cardClass = "rounded-xl bg-panel p-4";

/**
 * How to reach the customer: email and phone, side by side like the Figma. Only
 * signed-in customers check out (the cart belongs to their account), so there is
 * no guest option; both are filled in from the account and can be changed for
 * this order. The recipient's name is in the delivery address card.
 */
export function ContactCard() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CheckoutFormValues>();

  return (
    <section aria-label="Contact details" className={cardClass}>
      <div className="grid gap-2.5 sm:grid-cols-2">
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
