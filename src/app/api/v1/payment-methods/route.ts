import { json } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { getPaymentOptions } from "@/server/services/payment-proof-service";
import { marketQuerySchema } from "@/server/validation/cart-schemas";

/**
 * GET /api/v1/payment-methods?market=PK|DE: how a shopper of the market can
 * pay. Pakistan: cash on delivery, and bank transfer, Easypaisa and JazzCash
 * when staff have set up where to send the money (each of those comes with
 * its account details, and `holdHours` says how long an order waits for the
 * transfer). Germany: card. Public and not cached, so a change shows up at once.
 */
export const GET = route(
  { name: "payment_methods.list" },
  async ({ query }) => {
    const { market } = query(marketQuerySchema);
    return json(await getPaymentOptions(market));
  },
);
