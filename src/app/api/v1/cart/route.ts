import { customerRoute } from "@/server/auth/customer-route";
import { json } from "@/server/http/responses";
import { getCart } from "@/server/services/cart-service";
import { marketQuerySchema } from "@/server/validation/cart-schemas";

/** GET /api/v1/cart?market=PK|DE: the signed-in customer's cart, priced and checked against live stock for that market. */
export const GET = customerRoute(
  { name: "cart.get" },
  async ({ customer, query }) => {
    const { market } = query(marketQuerySchema);
    return json({ market, items: await getCart(customer.id, market) });
  },
);
