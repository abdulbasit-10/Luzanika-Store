import type { CurrencyCode } from "@/types/region";

interface MoneyOptions {
  /** Always show two decimals ("PKR 8,500.00"). Otherwise only when there are cents. */
  alwaysCents?: boolean;
}

/**
 * An amount in minor units (paisa / cents) as "PKR 8,500" or "EUR 895.90".
 * The currency code is always written, because the two markets are never
 * added together and a figure without its currency would be ambiguous.
 */
export function formatMinor(
  minorUnits: number,
  currency: CurrencyCode,
  { alwaysCents = false }: MoneyOptions = {},
): string {
  const digits = alwaysCents || minorUnits % 100 !== 0 ? 2 : 0;
  const amount = (minorUnits / 100).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${currency} ${amount}`;
}

/** A refund or amount a person types ("12.5" or "1,200") as minor units, or null when it is not a valid amount. */
export function parseMajorToMinor(text: string): number | null {
  const cleaned = text.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}
