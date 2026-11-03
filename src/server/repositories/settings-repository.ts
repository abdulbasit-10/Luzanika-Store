import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export interface Social {
  name: string;
  href: string;
}

/** Where customers send money. A method that is missing is not offered at checkout. */
export interface PaymentDetails {
  bank?: { bankName: string; accountTitle: string; accountNumber: string };
  easypaisa?: { accountTitle: string; number: string };
  jazzcash?: { accountTitle: string; number: string };
}

export interface SettingsRecord {
  shippingFeePk: number;
  shippingFeeDe: number;
  vatRateDePercent: number;
  reservationMinutes: number;
  /** How long an order that waits for a transfer holds its stock. */
  manualHoldHours: number;
  paymentDetails: PaymentDetails;
  contactEmail: string;
  contactAddress: string;
  customerServiceLabel: string;
  customerServicePhone: string;
  socials: Social[];
  updatedAt: Date;
}

interface SettingsRow {
  shipping_fee_pk: string;
  shipping_fee_de: string;
  vat_rate_de_percent: string;
  reservation_minutes: number;
  manual_hold_hours: number;
  payment_details: PaymentDetails;
  contact_email: string;
  contact_address: string;
  customer_service_label: string;
  customer_service_phone: string;
  socials: Social[];
  updated_at: Date;
}

export interface SettingsChanges {
  shippingFeePk?: number;
  shippingFeeDe?: number;
  vatRateDePercent?: number;
  reservationMinutes?: number;
  manualHoldHours?: number;
  /** Replaces all payment details: the service merges a patch into the current ones first. */
  paymentDetails?: PaymentDetails;
  contactEmail?: string;
  contactAddress?: string;
  customerServiceLabel?: string;
  customerServicePhone?: string;
  socials?: Social[];
}

function toRecord(row: SettingsRow): SettingsRecord {
  return {
    shippingFeePk: Number(row.shipping_fee_pk),
    shippingFeeDe: Number(row.shipping_fee_de),
    vatRateDePercent: Number(row.vat_rate_de_percent),
    reservationMinutes: row.reservation_minutes,
    manualHoldHours: row.manual_hold_hours,
    paymentDetails: row.payment_details,
    contactEmail: row.contact_email,
    contactAddress: row.contact_address,
    customerServiceLabel: row.customer_service_label,
    customerServicePhone: row.customer_service_phone,
    socials: row.socials,
    updatedAt: row.updated_at,
  };
}

const COLUMNS = `shipping_fee_pk, shipping_fee_de, vat_rate_de_percent, reservation_minutes,
  manual_hold_hours, payment_details,
  contact_email, contact_address, customer_service_label, customer_service_phone, socials, updated_at`;

export const settingsRepository = {
  /** The one settings row (the migration creates it). */
  async get(tx?: Tx): Promise<SettingsRecord> {
    const rows = await selectRows<SettingsRow>(
      `SELECT ${COLUMNS} FROM shop_settings WHERE id = 1`,
      {},
      tx,
    );
    if (!rows[0]) throw new Error("The shop settings row is missing.");
    return toRecord(rows[0]);
  },

  /** Locks the row, so two staff members saving at once cannot overwrite each other's change. */
  async lock(tx: Tx): Promise<SettingsRecord> {
    const rows = await selectRows<SettingsRow>(
      `SELECT ${COLUMNS} FROM shop_settings WHERE id = 1 FOR UPDATE`,
      {},
      tx,
    );
    if (!rows[0]) throw new Error("The shop settings row is missing.");
    return toRecord(rows[0]);
  },

  /** Changes only the fields given. */
  async update(
    changes: SettingsChanges,
    staffId: string,
    tx: Tx,
  ): Promise<void> {
    await execute(
      `UPDATE shop_settings SET
         shipping_fee_pk = COALESCE(:shippingFeePk, shipping_fee_pk),
         shipping_fee_de = COALESCE(:shippingFeeDe, shipping_fee_de),
         vat_rate_de_percent = COALESCE(:vatRateDePercent, vat_rate_de_percent),
         reservation_minutes = COALESCE(:reservationMinutes, reservation_minutes),
         manual_hold_hours = COALESCE(:manualHoldHours, manual_hold_hours),
         payment_details = COALESCE(CAST(:paymentDetails AS jsonb), payment_details),
         contact_email = COALESCE(:contactEmail, contact_email),
         contact_address = COALESCE(:contactAddress, contact_address),
         customer_service_label = COALESCE(:customerServiceLabel, customer_service_label),
         customer_service_phone = COALESCE(:customerServicePhone, customer_service_phone),
         socials = COALESCE(CAST(:socials AS jsonb), socials),
         updated_by = :staffId
       WHERE id = 1`,
      {
        shippingFeePk: changes.shippingFeePk ?? null,
        shippingFeeDe: changes.shippingFeeDe ?? null,
        vatRateDePercent: changes.vatRateDePercent ?? null,
        reservationMinutes: changes.reservationMinutes ?? null,
        manualHoldHours: changes.manualHoldHours ?? null,
        paymentDetails: changes.paymentDetails
          ? JSON.stringify(changes.paymentDetails)
          : null,
        contactEmail: changes.contactEmail ?? null,
        contactAddress: changes.contactAddress ?? null,
        customerServiceLabel: changes.customerServiceLabel ?? null,
        customerServicePhone: changes.customerServicePhone ?? null,
        socials: changes.socials ? JSON.stringify(changes.socials) : null,
        staffId,
      },
      tx,
    );
  },
};
