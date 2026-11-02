import { apiGet } from "@/lib/api-client";
import type { RegionCode } from "@/types/region";

/** The shipping fee and tax rule of one market, as the server will apply them to an order. */
export interface Pricing {
  market: RegionCode;
  /** Flat fee for an order with goods, in minor units. 0 means free shipping. */
  shippingFee: number;
  /** true: tax is already inside the prices (shown, not added). null: no tax is worked out. */
  taxIncluded: boolean | null;
  /** Percent of VAT inside the prices; null where no tax is worked out. */
  vatRatePercent: number | null;
}

/** GET /checkout/pricing */
export function fetchPricing(market: RegionCode): Promise<Pricing> {
  return apiGet<Pricing>("/checkout/pricing", { params: { market } });
}
