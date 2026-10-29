import { REGIONS } from "@/config/regions";
import type { CurrencyCode, Locale, RegionCode } from "@/types/region";

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: Locale, currency: CurrencyCode) {
  const key = `${locale}:${currency}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    // Explicit digits keep server (Node) and browser output identical; ICU versions disagree on PKR's default.
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
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
): string {
  return getFormatter(locale, currency).format(amount);
}

/** Formats an amount using a region's currency and default locale. */
export function formatRegionalPrice(
  amount: number,
  region: RegionCode,
  locale: Locale = REGIONS[region].defaultLocale,
): string {
  return formatCurrency(amount, REGIONS[region].currency, locale);
}
