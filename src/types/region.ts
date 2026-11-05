export type RegionCode = "PK" | "DE";

export type CurrencyCode = "PKR" | "EUR";

/** BCP 47 locale tag, e.g. "en-PK" or "de-DE". Independent of the region. */
export type Locale = string;

export interface RegionConfig {
  code: RegionCode;
  name: string;
  currency: CurrencyCode;
  defaultLocale: Locale;
}

/**
 * Price of a product in one region. Values are supplied by the backend;
 * the frontend never converts between currencies.
 */
export interface RegionalPrice {
  region: RegionCode;
  currency: CurrencyCode;
  /** Minor units (cents/paisa): 85000 is 850.00. */
  amount: number;
  /** The old price, shown struck through. While a discount applies it is the price before the discount. */
  compareAtAmount?: number;
  /** Whole percent off while a discount applies; `amount` is already the discounted price. */
  discountPercent?: number;
}
