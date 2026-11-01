import { customerRoute } from "@/server/auth/customer-route";
import { json } from "@/server/http/responses";
import { removeSelectedCartItems } from "@/server/services/cart-service";
import { marketQuerySchema } from "@/server/validation/cart-schemas";

/** DELETE /api/v1/cart/selected?market=PK|DE: removes the ticked, buyable lines (what was just ordered). */
export const DELETE = customerRoute(
  { name: "cart.removeSelected", rateLimit: { limit: 60, windowSec: 10 * 60 } },
  async ({ customer, query }) => {
    const { market } = query(marketQuerySchema);
    return json({
      market,
      items: await removeSelectedCartItems(customer.id, market),
    });
  },
);
