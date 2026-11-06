"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, fieldControlClass } from "@/components/ui/field";
import { Radio } from "@/components/ui/radio";
import { type CheckoutFormValues } from "@/features/checkout/checkout-schema";
import { cardClass } from "@/features/checkout/contact-card";
import { COUNTRY_LIST_ID } from "@/features/checkout/shipping-card";
import { PaymentAccount } from "@/features/orders/payment-account";
import {
  paymentMethodLabels,
  type PaymentOption,
} from "@/features/orders/payment-methods";
import { usePaymentOptions } from "@/features/orders/use-payment-options";
import type { RegionCode } from "@/types/region";

/** What the shopper should know about the chosen way of paying. */
function MethodNote({
  option,
  holdHours,
}: {
  option: PaymentOption;
  holdHours?: number;
}) {
  if (option.method === "card") {
    return (
      <p role="status" className="mt-2.5 text-sm text-muted-foreground">
        You enter your card details on our payment provider&apos;s secure page
        right after you place the order. Your card number is never sent to, or
        stored by, Luzanika.
      </p>
    );
  }
  if (option.method === "cod") {
    return (
      <p role="status" className="mt-2.5 text-sm text-muted-foreground">
        Pay in cash to the courier when your order arrives. Please keep the
        exact amount ready and make sure your phone number is correct: we may
        call you to confirm the order.
      </p>
    );
  }
  return (
    <div role="status" className="mt-2.5 text-sm text-muted-foreground">
      <p>
        Send the order total to this account from your{" "}
        {option.method === "bank_transfer" ? "banking" : "wallet"} app.{" "}
        {holdHours ? `Your items are held for ${holdHours} hours.` : null} After
        you place the order, you add the transaction ID or a screenshot of the
        payment, and we confirm it.
      </p>
      <PaymentAccount option={option} />
    </div>
  );
}

/*
 * Payment choice and billing address. There is no card form: card details are
 * typed into the payment provider's secure fields after the order is placed,
 * so they never pass through this page or our server. The ways to pay come
 * from the server (they depend on the market and on which accounts are set up).
 */
export function PaymentCard({ region }: { region: RegionCode }) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<CheckoutFormValues>();
  const method = useWatch({ control, name: "paymentMethod" });
  const sameBilling = useWatch({ control, name: "sameBilling" });
  const { options, isLoading, isError, refetch } = usePaymentOptions(region);

  // A choice that is not offered (another market, or an account that was taken away) moves to the first one that is.
  useEffect(() => {
    if (
      options &&
      options.methods.length > 0 &&
      !options.methods.some((option) => option.method === method)
    ) {
      setValue("paymentMethod", options.methods[0].method);
    }
  }, [options, method, setValue]);

  const chosen = options?.methods.find((option) => option.method === method);

  return (
    <section aria-labelledby="checkout-payment-title" className={cardClass}>
      <h2
        id="checkout-payment-title"
        className="font-heading text-lg leading-6 font-medium"
      >
        How would you like to pay?
      </h2>

      {isLoading ? (
        <p role="status" className="mt-2.5 text-sm text-muted-foreground">
          Loading payment methods…
        </p>
      ) : isError || !options ? (
        <p role="alert" className="mt-2.5 text-sm text-danger">
          We couldn&apos;t load the payment methods.{" "}
          <button
            type="button"
            onClick={() => void refetch()}
            className="underline"
          >
            Try again
          </button>
        </p>
      ) : (
        <>
          <div
            role="radiogroup"
            aria-labelledby="checkout-payment-title"
            className="mt-3 flex flex-col gap-2.5"
          >
            {options.methods.map((option) => (
              <Radio
                key={option.method}
                value={option.method}
                label={paymentMethodLabels[option.method]}
                {...register("paymentMethod")}
              />
            ))}
          </div>

          {chosen ? (
            <MethodNote option={chosen} holdHours={options.holdHours} />
          ) : null}
        </>
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
