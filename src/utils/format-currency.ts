import { REGIONS } from "@/config/regions";
import type { CurrencyCode, Locale, RegionCode } from "@/types/region";

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(
  locale: Locale,
  currency: CurrencyCode,
  fractionDigits: number,
) {
  const key = `${locale}:${currency}:${fractionDigits}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    // Explicit digits keep server (Node) and browser output identical; ICU versions disagree on PKR's default.
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

interface FormatOptions {
  /** Decimal places to show; prices use 2, range labels use 0. */
  fractionDigits?: number;
}

/**
 * Formats an amount in the given currency. The locale (language/number
 * conventions) is independent of the currency, so a German-speaking visitor
 * can still see PKR prices and vice versa.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  locale: Locale,
  { fractionDigits = 2 }: FormatOptions = {},
): string {
  return getFormatter(locale, currency, fractionDigits).format(amount);
}

/** Formats an amount using a region's currency and default locale. */
export function formatRegionalPrice(
  amount: number,
  region: RegionCode,
  locale: Locale = REGIONS[region].defaultLocale,
  options?: FormatOptions,
): string {
  return formatCurrency(amount, REGIONS[region].currency, locale, options);
}
