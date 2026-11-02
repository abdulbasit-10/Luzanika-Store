import { json } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { getPricingConfig } from "@/server/services/settings-service";
import { marketQuerySchema } from "@/server/validation/cart-schemas";

/**
 * GET /api/v1/checkout/pricing?market=PK|DE: the shipping fee and tax rule of a
 * market, so the cart and checkout can show exactly what the server will
 * charge (the server still works the amounts out itself when an order is
 * placed). Public and not cached, so a changed fee shows up at once.
 */
export const GET = route({ name: "checkout.pricing" }, async ({ query }) => {
  const { market } = query(marketQuerySchema);
  const config = await getPricingConfig();

  return json({
    market,
    /** Flat fee for an order with goods, in minor units. 0 means free shipping. */
    shippingFee: config.shippingFee[market],
    /** true: tax is already inside the prices (shown, not added). null: no tax. */
    taxIncluded: market === "DE" ? true : null,
    /** Percent of VAT inside the prices; null where no tax is worked out. */
    vatRatePercent: market === "DE" ? config.vatRateDePercent : null,
  });
});
