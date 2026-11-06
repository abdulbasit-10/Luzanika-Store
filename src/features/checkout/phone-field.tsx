"use client";

import { Check, ChevronDown } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { RegionFlag } from "@/components/shared/region-flag";
import { Field } from "@/components/ui/field";
import {
  PHONE_CODES,
  PHONE_PATTERN,
  limitPhoneInput,
  phoneProblem,
  type CheckoutFormValues,
} from "@/features/checkout/checkout-schema";

/**
 * The phone number field of the Figma: a round flag, the country code (with a
 * small arrow), a divider, the number, and a check mark once the number is
 * right for that country. The code is chosen from the two markets; it is put in front of the
 * number when the order is sent (see fullPhoneNumber).
 */
export function PhoneField() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<CheckoutFormValues>();
  const code = useWatch({ control, name: "phoneCode" });
  const phone = useWatch({ control, name: "phone" });
  const flagRegion = PHONE_CODES.find((entry) => entry.code === code)?.region;
  const { onChange: onPhoneChange, ...phoneProps } = register("phone");
  const looksRight =
    PHONE_PATTERN.test(phone.trim()) && !phoneProblem(phone, code);

  return (
    <Field
      id="checkout-phone"
      label="Phone Number"
      required
      hint="For SMS dispatch updates & courier confirmation."
      error={errors.phone?.message}
    >
      <div className="flex h-10 w-full items-center gap-2 rounded-[10px] bg-white px-3 text-sm text-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring has-[[aria-invalid=true]]:outline-2 has-[[aria-invalid=true]]:outline-danger">
        <RegionFlag
          region={flagRegion ?? "PK"}
          className="size-6 rounded-full"
        />
        <div className="relative flex shrink-0 items-center">
          <select
            aria-label="Country code"
            className="cursor-pointer appearance-none bg-transparent pr-5 text-muted-foreground focus-visible:outline-none"
            {...register("phoneCode")}
          >
            {PHONE_CODES.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.code}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-0 size-4 text-muted-foreground"
          />
        </div>
        <span aria-hidden className="h-5 w-px shrink-0 bg-black/20" />
        <input
          id="checkout-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="0300 4589211"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby="checkout-phone-message"
          className="min-w-0 flex-1 bg-transparent placeholder:text-muted-foreground focus-visible:outline-none"
          {...phoneProps}
          onChange={(event) => {
            // Cut what is typed or pasted down to a complete number before the form sees it.
            event.target.value = limitPhoneInput(event.target.value, code);
            return onPhoneChange(event);
          }}
        />
        {looksRight ? (
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-md border border-accent text-accent"
          >
            <Check className="size-3.5" strokeWidth={2.5} />
          </span>
        ) : null}
      </div>
    </Field>
  );
}
