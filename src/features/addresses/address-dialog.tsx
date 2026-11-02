"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { REGION_LIST } from "@/config/regions";
import { profileControlClass } from "@/features/account/profile-fields";
import {
  addressSchema,
  type AddressFormValues,
} from "@/features/addresses/address-schema";
import type { SavedAddress } from "@/stores/address-store";

const EMPTY: AddressFormValues = {
  fullName: "",
  phone: "",
  country: "",
  city: "",
  address: "",
  zip: "",
  isDefault: false,
};

const toValues = (address: SavedAddress | null): AddressFormValues =>
  address
    ? {
        fullName: address.fullName,
        phone: address.phone,
        country: address.country,
        city: address.city,
        address: address.address,
        zip: address.zip,
        isDefault: address.isDefault,
      }
    : EMPTY;

interface AddressDialogProps {
  open: boolean;
  /** The address being edited, or null to add a new one. */
  address: SavedAddress | null;
  /** True when this will be the visitor's first address, which becomes the default. */
  first: boolean;
  onClose: () => void;
  onSave: (values: AddressFormValues) => void;
}

/** Modal form to add or edit an address. Uses the native <dialog>, so it traps focus and closes on Escape. */
export function AddressDialog({
  open,
  address,
  first,
  onClose,
  onSave,
}: AddressDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const countriesId = useId();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const values = toValues(address);
      reset(first ? { ...values, isDefault: true } : values);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, address, first, reset]);

  const lockedDefault = first || Boolean(address?.isDefault);
  const control = profileControlClass(true);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the backdrop lands on the dialog itself, not on its content.
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[520px] overflow-y-auto rounded-xl bg-white p-0 text-foreground shadow-overlay backdrop:bg-black/50"
    >
      <form
        noValidate
        onSubmit={handleSubmit((values) =>
          onSave({
            ...values,
            isDefault: lockedDefault || values.isDefault,
          }),
        )}
        className="relative p-5 sm:p-6"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X aria-hidden className="size-4" />
        </button>

        <h2 id={titleId} className="font-heading text-xl font-medium">
          {address ? "Edit address" : "Add new address"}
        </h2>

        <div className="mt-4 grid gap-x-3 gap-y-3 sm:grid-cols-2">
          <Field
            id="address-name"
            label="Full name"
            required
            error={errors.fullName?.message}
          >
            <input
              id="address-name"
              autoComplete="name"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby="address-name-message"
              className={control}
              {...register("fullName")}
            />
          </Field>
          <Field
            id="address-phone"
            label="Phone number"
            required
            error={errors.phone?.message}
          >
            <input
              id="address-phone"
              type="tel"
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby="address-phone-message"
              className={control}
              {...register("phone")}
            />
          </Field>
          <Field
            id="address-country"
            label="Country"
            required
            error={errors.country?.message}
          >
            <input
              id="address-country"
              list={countriesId}
              autoComplete="country-name"
              aria-invalid={Boolean(errors.country)}
              aria-describedby="address-country-message"
              className={control}
              {...register("country")}
            />
            <datalist id={countriesId}>
              {REGION_LIST.map((region) => (
                <option key={region.code} value={region.name} />
              ))}
            </datalist>
          </Field>
          <Field
            id="address-city"
            label="City"
            required
            error={errors.city?.message}
          >
            <input
              id="address-city"
              autoComplete="address-level2"
              aria-invalid={Boolean(errors.city)}
              aria-describedby="address-city-message"
              className={control}
              {...register("city")}
            />
          </Field>
          <Field
            id="address-street"
            label="Street address"
            required
            error={errors.address?.message}
            className="sm:col-span-2"
          >
            <input
              id="address-street"
              autoComplete="street-address"
              aria-invalid={Boolean(errors.address)}
              aria-describedby="address-street-message"
              className={control}
              {...register("address")}
            />
          </Field>
          <Field
            id="address-zip"
            label="ZIP code"
            required
            error={errors.zip?.message}
          >
            <input
              id="address-zip"
              autoComplete="postal-code"
              aria-invalid={Boolean(errors.zip)}
              aria-describedby="address-zip-message"
              className={control}
              {...register("zip")}
            />
          </Field>
        </div>

        <Checkbox
          label="Set as default address"
          disabled={lockedDefault}
          className="mt-4"
          {...register("isDefault")}
        />

        <div className="mt-5 flex justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="rounded-md px-4 py-2.5"
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" className="rounded-md px-4 py-2.5">
            Save address
          </Button>
        </div>
      </form>
    </dialog>
  );
}
