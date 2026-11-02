import "server-only";

import { recordAudit } from "@/server/audit/audit";
import { withTransaction, type Tx } from "@/server/db/transaction";
import type { PricingConfig } from "@/server/orders/order-totals";
import {
  settingsRepository,
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
  contact?: Partial<ShopSettingsDto["contact"]>;
  socials?: Social[];
}

export async function updateShopSettings(
  ctx: AdminContext,
  patch: SettingsPatch,
): Promise<ShopSettingsDto> {
  const changes: SettingsChanges = {
    shippingFeePk: patch.shippingFee?.PK,
    shippingFeeDe: patch.shippingFee?.DE,
    vatRateDePercent: patch.vatRateDePercent,
    reservationMinutes: patch.reservationMinutes,
    contactEmail: patch.contact?.email,
    contactAddress: patch.contact?.address,
    customerServiceLabel: patch.contact?.customerServiceLabel,
    customerServicePhone: patch.contact?.customerServicePhone,
    socials: patch.socials,
  };

  return withTransaction(async (tx) => {
    const before = toDto(await settingsRepository.lock(tx));
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
