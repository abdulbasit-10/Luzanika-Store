"use client";

import { useFormContext } from "react-hook-form";

import { Field, fieldControlClass } from "@/components/ui/field";
import { cardClass } from "@/features/checkout/contact-card";
import type { CheckoutFormValues } from "@/features/checkout/checkout-schema";
import { REGION_LIST } from "@/config/regions";

export const COUNTRY_LIST_ID = "checkout-countries";

/**
 * Delivery address. The country starts as the selected region's country (set by
 * the parent) but can be edited; the suggestions are the two markets.
 */
export function ShippingCard({
  onCountryEdited,
}: {
  onCountryEdited: () => void;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<CheckoutFormValues>();

  return (
    <section aria-label="Delivery address" className={cardClass}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <Field
          id="checkout-company"
          label="Company Name (Optional)"
          error={errors.company?.message}
        >
          <input
            id="checkout-company"
            type="text"
            autoComplete="organization"
            placeholder="Company Name"
            aria-invalid={Boolean(errors.company)}
            aria-describedby="checkout-company-message"
            className={fieldControlClass}
            {...register("company")}
          />
        </Field>
        <Field
          id="checkout-country"
          label="Country"
          required
          error={errors.country?.message}
        >
          <input
            id="checkout-country"
            type="text"
            list={COUNTRY_LIST_ID}
            autoComplete="country-name"
            placeholder="Country Name"
            aria-invalid={Boolean(errors.country)}
            aria-describedby="checkout-country-message"
            className={fieldControlClass}
            {...register("country", { onChange: onCountryEdited })}
          />
          <datalist id={COUNTRY_LIST_ID}>
            {REGION_LIST.map((region) => (
              <option key={region.code} value={region.name} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
        <Field
          id="checkout-city"
          label="City"
          required
          error={errors.city?.message}
        >
          <input
            id="checkout-city"
            type="text"
            autoComplete="address-level2"
            placeholder="Peshawar"
            aria-invalid={Boolean(errors.city)}
            aria-describedby="checkout-city-message"
            className={fieldControlClass}
            {...register("city")}
          />
        </Field>
        <Field
          id="checkout-address"
          label="Address"
          required
          error={errors.address?.message}
        >
          <input
            id="checkout-address"
            type="text"
            autoComplete="street-address"
            placeholder="2694 Royal Ln, Mesa"
            aria-invalid={Boolean(errors.address)}
            aria-describedby="checkout-address-message"
            className={fieldControlClass}
            {...register("address")}
          />
        </Field>
        <Field
          id="checkout-zip"
          label="ZIP Code"
          required
          error={errors.zip?.message}
        >
          <input
            id="checkout-zip"
            type="text"
            autoComplete="postal-code"
            placeholder="23020"
            aria-invalid={Boolean(errors.zip)}
            aria-describedby="checkout-zip-message"
            className={fieldControlClass}
            {...register("zip")}
          />
        </Field>
      </div>
    </section>
  );
}
