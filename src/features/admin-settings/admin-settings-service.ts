import { apiGet, apiPatch } from "@/lib/api-client";

export interface BankAccount {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
}

export interface WalletAccount {
  accountTitle: string;
  number: string;
}

/** GET /admin/settings. Fees are in minor units (paisa / cents). */
export interface AdminSettings {
  shippingFee: { PK: number; DE: number };
  /** Percent of VAT already inside German prices. */
  vatRateDePercent: number;
  /** How long an unpaid card / cash order holds its stock. */
  reservationMinutes: number;
  payments: {
    manualHoldHours: number;
    /** Null: not offered at checkout. */
    bank: BankAccount | null;
    easypaisa: WalletAccount | null;
    jazzcash: WalletAccount | null;
  };
  contact: {
    email: string;
    address: string;
    customerServiceLabel: string;
    customerServicePhone: string;
  };
  updatedAt: string;
}

/** What PATCH /admin/settings accepts: only the parts that are sent change. A payment method set to null is removed. */
export interface SettingsPatch {
  shippingFee?: { PK?: number; DE?: number };
  vatRateDePercent?: number;
  reservationMinutes?: number;
  payments?: {
    manualHoldHours?: number;
    bank?: BankAccount | null;
    easypaisa?: WalletAccount | null;
    jazzcash?: WalletAccount | null;
  };
  contact?: Partial<AdminSettings["contact"]>;
}

export async function fetchAdminSettings(): Promise<AdminSettings> {
  const { settings } = await apiGet<{ settings: AdminSettings }>(
    "/admin/settings",
  );
  return settings;
}

export async function saveAdminSettings(
  patch: SettingsPatch,
): Promise<AdminSettings> {
  const { settings } = await apiPatch<{ settings: AdminSettings }>(
    "/admin/settings",
    patch,
  );
  return settings;
}
