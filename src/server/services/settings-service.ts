import "server-only";

import { recordAudit } from "@/server/audit/audit";
import { withTransaction, type Tx } from "@/server/db/transaction";
import type { PricingConfig } from "@/server/orders/order-totals";
import {
  settingsRepository,
  type PaymentDetails,
  type SettingsChanges,
  type SettingsRecord,
  type Social,
} from "@/server/repositories/settings-repository";
import type { AdminContext } from "@/server/services/staff-admin-service";

/** What staff see and change in the admin. */
export interface ShopSettingsDto {
  shippingFee: { PK: number; DE: number };
  /** Percent of VAT already inside German prices. */
  vatRateDePercent: number;
  /** How long an unpaid order holds its stock. Only affects orders placed afterwards. */
  reservationMinutes: number;
  /** Bank, Easypaisa and JazzCash: where customers send the money (null: not offered). */
  payments: {
    /** How long an order waiting for a transfer holds its stock. Only affects orders placed afterwards. */
    manualHoldHours: number;
    bank: PaymentDetails["bank"] | null;
    easypaisa: PaymentDetails["easypaisa"] | null;
    jazzcash: PaymentDetails["jazzcash"] | null;
  };
  contact: {
    email: string;
    address: string;
    customerServiceLabel: string;
    customerServicePhone: string;
  };
  socials: Social[];
  updatedAt: string;
}

/** What the public site may read: the contact details, nothing else. */
export interface PublicShopSettingsDto {
  contact: ShopSettingsDto["contact"];
  socials: Social[];
}

function toDto(record: SettingsRecord): ShopSettingsDto {
  return {
    shippingFee: { PK: record.shippingFeePk, DE: record.shippingFeeDe },
    vatRateDePercent: record.vatRateDePercent,
    reservationMinutes: record.reservationMinutes,
    payments: {
      manualHoldHours: record.manualHoldHours,
      bank: record.paymentDetails.bank ?? null,
      easypaisa: record.paymentDetails.easypaisa ?? null,
      jazzcash: record.paymentDetails.jazzcash ?? null,
    },
    contact: {
      email: record.contactEmail,
      address: record.contactAddress,
      customerServiceLabel: record.customerServiceLabel,
      customerServicePhone: record.customerServicePhone,
    },
    socials: record.socials,
    updatedAt: record.updatedAt.toISOString(),
  };
}

/** The shipping and tax settings in the shape the order maths uses. Read inside the order's transaction so what is charged is what is read. */
export async function getPricingConfig(tx?: Tx): Promise<PricingConfig> {
  const settings = await settingsRepository.get(tx);
  return {
    shippingFee: { PK: settings.shippingFeePk, DE: settings.shippingFeeDe },
    vatRateDePercent: settings.vatRateDePercent,
  };
}

export async function getReservationMinutes(tx?: Tx): Promise<number> {
  return (await settingsRepository.get(tx)).reservationMinutes;
}

/** How long to hold stock for an order waiting for a transfer, and where the money should be sent. Read inside the order's transaction. */
export async function getPaymentSettings(
  tx?: Tx,
): Promise<{ manualHoldHours: number; details: PaymentDetails }> {
  const settings = await settingsRepository.get(tx);
  return {
    manualHoldHours: settings.manualHoldHours,
    details: settings.paymentDetails,
  };
}

export async function getShopSettings(): Promise<ShopSettingsDto> {
  return toDto(await settingsRepository.get());
}

export async function getPublicShopSettings(): Promise<PublicShopSettingsDto> {
  const { contact, socials } = toDto(await settingsRepository.get());
  return { contact, socials };
}

export interface SettingsPatch {
  shippingFee?: { PK?: number; DE?: number };
  vatRateDePercent?: number;
  reservationMinutes?: number;
  /** A method set to null is removed (no longer offered); one that is left out stays as it is. */
  payments?: {
    manualHoldHours?: number;
    bank?: PaymentDetails["bank"] | null;
    easypaisa?: PaymentDetails["easypaisa"] | null;
    jazzcash?: PaymentDetails["jazzcash"] | null;
  };
  contact?: Partial<ShopSettingsDto["contact"]>;
  socials?: Social[];
}

/** The payment details after a patch: a given method replaces the old one, null removes it, a missing one stays. */
function mergeDetails(
  current: PaymentDetails,
  patch: SettingsPatch["payments"],
): PaymentDetails | undefined {
  if (!patch) return undefined;
  const next: PaymentDetails = { ...current };
  for (const key of ["bank", "easypaisa", "jazzcash"] as const) {
    if (patch[key] === undefined) continue;
    if (patch[key] === null) delete next[key];
    else Object.assign(next, { [key]: patch[key] });
  }
  return next;
}

export async function updateShopSettings(
  ctx: AdminContext,
  patch: SettingsPatch,
): Promise<ShopSettingsDto> {
  return withTransaction(async (tx) => {
    const current = await settingsRepository.lock(tx);
    const before = toDto(current);
    const changes: SettingsChanges = {
      shippingFeePk: patch.shippingFee?.PK,
      shippingFeeDe: patch.shippingFee?.DE,
      vatRateDePercent: patch.vatRateDePercent,
      reservationMinutes: patch.reservationMinutes,
      manualHoldHours: patch.payments?.manualHoldHours,
      paymentDetails: mergeDetails(current.paymentDetails, patch.payments),
      contactEmail: patch.contact?.email,
      contactAddress: patch.contact?.address,
      customerServiceLabel: patch.contact?.customerServiceLabel,
      customerServicePhone: patch.contact?.customerServicePhone,
      socials: patch.socials,
    };
    await settingsRepository.update(changes, ctx.actor.id, tx);
    const after = toDto(await settingsRepository.get(tx));

    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "settings.update",
        entityType: "settings",
        entityId: "shop",
        before: { ...before, updatedAt: undefined },
        after: { ...after, updatedAt: undefined },
      },
      ctx.requestId,
    );
    return after;
  });
}
