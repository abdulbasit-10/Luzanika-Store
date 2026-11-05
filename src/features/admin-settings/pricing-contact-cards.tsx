"use client";

import { useState } from "react";

import {
  DetailCard,
  Field,
  inputClass,
} from "@/features/admin-orders/order-detail-ui";

import type { AdminSettings } from "./admin-settings-service";
import { majorText } from "@/features/admin-orders/order-detail-forms";
import {
  contactProblems,
  feeToMinor,
  pricingProblems,
  type ContactValues,
  type PricingValues,
} from "./settings-forms";
import { SaveBar, useSaveSettings } from "./settings-ui";

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  readOnly: boolean;
  hint?: string;
  inputMode?: "decimal" | "numeric" | "tel" | "email";
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  readOnly,
  inputMode,
}: TextFieldProps) {
  return (
    <Field id={id} label={label} error={error}>
      <input
        id={id}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-error`}
        className={inputClass}
      />
    </Field>
  );
}

/** Shipping fee of each market, German VAT and how long an unpaid card / cash order holds its stock. */
export function ShippingTaxCard({
  settings,
  canEdit,
}: {
  settings: AdminSettings;
  canEdit: boolean;
}) {
  const [values, setValues] = useState<PricingValues>({
    feePk: majorText(settings.shippingFee.PK),
    feeDe: majorText(settings.shippingFee.DE),
    vat: String(settings.vatRateDePercent),
    holdMinutes: String(settings.reservationMinutes),
  });
  const [shown, setShown] = useState(false);
  const save = useSaveSettings("Shipping and tax saved");
  const problems = pricingProblems(values);
  const set = (key: keyof PricingValues) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const issue = (key: keyof PricingValues) =>
    shown ? problems[key] : undefined;

  return (
    <DetailCard title="Shipping & tax">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setShown(true);
          if (Object.keys(problems).length > 0) return;
          save.mutate({
            shippingFee: {
              PK: feeToMinor(values.feePk) ?? 0,
              DE: feeToMinor(values.feeDe) ?? 0,
            },
            vatRateDePercent: Number(values.vat),
            reservationMinutes: Number(values.holdMinutes),
          });
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <TextField
          id="fee-pk"
          label="Shipping fee, Pakistan (PKR)"
          value={values.feePk}
          onChange={set("feePk")}
          error={issue("feePk")}
          readOnly={!canEdit}
          inputMode="decimal"
        />
        <TextField
          id="fee-de"
          label="Shipping fee, Germany (EUR)"
          value={values.feeDe}
          onChange={set("feeDe")}
          error={issue("feeDe")}
          readOnly={!canEdit}
          inputMode="decimal"
        />
        <TextField
          id="vat"
          label="German VAT inside prices (%)"
          value={values.vat}
          onChange={set("vat")}
          error={issue("vat")}
          readOnly={!canEdit}
          inputMode="decimal"
        />
        <TextField
          id="hold-minutes"
          label="Hold unpaid card orders (minutes)"
          value={values.holdMinutes}
          onChange={set("holdMinutes")}
          error={issue("holdMinutes")}
          readOnly={!canEdit}
          inputMode="numeric"
        />
        <div className="sm:col-span-2">
          <p className="text-xs text-muted-foreground">
            New orders use these at once. Orders already placed keep the amounts
            they were placed with. A fee of 0 means free shipping.
          </p>
          <SaveBar
            canEdit={canEdit}
            pending={save.isPending}
            error={save.error}
          />
        </div>
      </form>
    </DetailCard>
  );
}

/** The contact details the shop shows on its pages. */
export function ContactCard({
  settings,
  canEdit,
}: {
  settings: AdminSettings;
  canEdit: boolean;
}) {
  const [values, setValues] = useState<ContactValues>(settings.contact);
  const [shown, setShown] = useState(false);
  const save = useSaveSettings("Shop contact saved");
  const problems = contactProblems(values);
  const set = (key: keyof ContactValues) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const issue = (key: keyof ContactValues) =>
    shown ? problems[key] : undefined;

  return (
    <DetailCard title="Shop contact">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setShown(true);
          if (Object.keys(problems).length > 0) return;
          save.mutate({
            contact: {
              email: values.email.trim(),
              address: values.address.trim(),
              customerServiceLabel: values.customerServiceLabel.trim(),
              customerServicePhone: values.customerServicePhone.trim(),
            },
          });
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <TextField
          id="contact-email"
          label="Email"
          value={values.email}
          onChange={set("email")}
          error={issue("email")}
          readOnly={!canEdit}
          inputMode="email"
        />
        <TextField
          id="contact-phone"
          label="Customer service phone"
          value={values.customerServicePhone}
          onChange={set("customerServicePhone")}
          error={issue("customerServicePhone")}
          readOnly={!canEdit}
          inputMode="tel"
        />
        <TextField
          id="contact-label"
          label="Customer service label"
          value={values.customerServiceLabel}
          onChange={set("customerServiceLabel")}
          error={issue("customerServiceLabel")}
          readOnly={!canEdit}
        />
        <TextField
          id="contact-address"
          label="Address"
          value={values.address}
          onChange={set("address")}
          error={issue("address")}
          readOnly={!canEdit}
        />
        <div className="sm:col-span-2">
          <SaveBar
            canEdit={canEdit}
            pending={save.isPending}
            error={save.error}
          />
        </div>
      </form>
    </DetailCard>
  );
}
