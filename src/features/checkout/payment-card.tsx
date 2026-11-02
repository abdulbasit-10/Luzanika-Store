"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import {
  useFormContext,
  useWatch,
  type UseFormRegisterReturn,
} from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, fieldControlClass } from "@/components/ui/field";
import { Radio } from "@/components/ui/radio";
import { CardBrands } from "@/features/checkout/card-brands";
import {
  formatCardNumber,
  formatCvv,
  formatExpiry,
} from "@/features/checkout/card-format";
import {
  PAYMENT_METHODS,
  type CheckoutFormValues,
  type PaymentMethod,
} from "@/features/checkout/checkout-schema";
import { cardClass } from "@/features/checkout/contact-card";
import { COUNTRY_LIST_ID } from "@/features/checkout/shipping-card";

const methodLabels: Record<PaymentMethod, string> = {
  card: "Pay with Credit Card",
  paypal: "Pay with PayPal",
  "gift-card": "Use Gift Card",
};

const unavailableNotes: Record<Exclude<PaymentMethod, "card">, string> = {
  paypal: "PayPal checkout is not available yet. Please pay by credit card.",
  "gift-card": "Gift cards are not available yet. Please pay by credit card.",
};

/** Applies a formatter to what is typed before react-hook-form stores it. */
function withFormat(
  field: UseFormRegisterReturn,
  format: (value: string) => string,
) {
  return {
    ...field,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      event.target.value = format(event.target.value);
      return field.onChange(event);
    },
  };
}

/*
 * Payment choice and card form. Card details live only in this form's memory:
 * they are not saved, logged or sent anywhere (see checkout-service). A real
 * integration replaces these inputs with the payment provider's secure fields.
 */
export function PaymentCard() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CheckoutFormValues>();
  const method = useWatch({ control, name: "paymentMethod" });
  const sameBilling = useWatch({ control, name: "sameBilling" });

  return (
    <section aria-labelledby="checkout-payment-title" className={cardClass}>
      <h2
        id="checkout-payment-title"
        className="font-heading text-lg leading-6 font-medium"
      >
        How would you like to pay?
      </h2>

      <div
        role="radiogroup"
        aria-labelledby="checkout-payment-title"
        className="mt-2.5 flex flex-wrap gap-x-6 gap-y-2"
      >
        {PAYMENT_METHODS.map((value) => (
          <Radio
            key={value}
            value={value}
            label={methodLabels[value]}
            {...register("paymentMethod")}
          />
        ))}
      </div>

      {method === "card" ? (
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
          <Field
            id="checkout-card-name"
            label="Name on card"
            error={errors.cardName?.message}
          >
            <input
              id="checkout-card-name"
              type="text"
              autoComplete="cc-name"
              placeholder="Eduard Franz"
              aria-invalid={Boolean(errors.cardName)}
              aria-describedby="checkout-card-name-message"
              className={fieldControlClass}
              {...register("cardName")}
            />
          </Field>
          <Field
            id="checkout-card-number"
            label="Card Number"
            error={errors.cardNumber?.message}
          >
            <div className="relative">
              <input
                id="checkout-card-number"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 5678 9012 3456"
                aria-invalid={Boolean(errors.cardNumber)}
                aria-describedby="checkout-card-number-message"
                className={`${fieldControlClass} pr-28`}
                {...withFormat(register("cardNumber"), formatCardNumber)}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                <CardBrands />
              </span>
            </div>
          </Field>
          <Field
            id="checkout-card-expiry"
            label="Expiry date"
            error={errors.cardExpiry?.message}
          >
            <input
              id="checkout-card-expiry"
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              aria-invalid={Boolean(errors.cardExpiry)}
              aria-describedby="checkout-card-expiry-message"
              className={fieldControlClass}
              {...withFormat(register("cardExpiry"), formatExpiry)}
            />
          </Field>
          <Field
            id="checkout-card-cvv"
            label="CVV"
            error={errors.cardCvv?.message}
          >
            <input
              id="checkout-card-cvv"
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              aria-invalid={Boolean(errors.cardCvv)}
              aria-describedby="checkout-card-cvv-message"
              className={fieldControlClass}
              {...withFormat(register("cardCvv"), formatCvv)}
            />
          </Field>
        </div>
      ) : (
        <p role="status" className="mt-2.5 text-sm text-muted-foreground">
          {unavailableNotes[method]}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2.5">
        <Checkbox
          label="Use shipping address as billing address"
          className="items-center"
          {...register("sameBilling")}
        />

        {sameBilling ? null : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field
              id="checkout-billing-country"
              label="Billing Country"
              required
              error={errors.billingCountry?.message}
            >
              <input
                id="checkout-billing-country"
                type="text"
                list={COUNTRY_LIST_ID}
                autoComplete="billing country-name"
                aria-invalid={Boolean(errors.billingCountry)}
                aria-describedby="checkout-billing-country-message"
                className={fieldControlClass}
                {...register("billingCountry")}
              />
            </Field>
            <Field
              id="checkout-billing-city"
              label="Billing City"
              required
              error={errors.billingCity?.message}
            >
              <input
                id="checkout-billing-city"
                type="text"
                autoComplete="billing address-level2"
                aria-invalid={Boolean(errors.billingCity)}
                aria-describedby="checkout-billing-city-message"
                className={fieldControlClass}
                {...register("billingCity")}
              />
            </Field>
            <Field
              id="checkout-billing-address"
              label="Billing Address"
              required
              error={errors.billingAddress?.message}
            >
              <input
                id="checkout-billing-address"
                type="text"
                autoComplete="billing street-address"
                aria-invalid={Boolean(errors.billingAddress)}
                aria-describedby="checkout-billing-address-message"
                className={fieldControlClass}
                {...register("billingAddress")}
              />
            </Field>
            <Field
              id="checkout-billing-zip"
              label="Billing ZIP Code"
              required
              error={errors.billingZip?.message}
            >
              <input
                id="checkout-billing-zip"
                type="text"
                autoComplete="billing postal-code"
                aria-invalid={Boolean(errors.billingZip)}
                aria-describedby="checkout-billing-zip-message"
                className={fieldControlClass}
                {...register("billingZip")}
              />
            </Field>
          </div>
        )}

        <div>
          <Checkbox
            className="items-center"
            aria-describedby={
              errors.acceptTerms ? "checkout-terms-error" : undefined
            }
            aria-invalid={Boolean(errors.acceptTerms)}
            label={
              <>
                I accept Luzanika{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Terms &amp; Conditions
                </Link>
              </>
            }
            {...register("acceptTerms")}
          />
          {errors.acceptTerms ? (
            <p
              id="checkout-terms-error"
              role="alert"
              className="mt-1 text-xs text-danger"
            >
              {errors.acceptTerms.message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
