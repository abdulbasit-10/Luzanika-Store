import { customerRoute } from "@/server/auth/customer-route";
import { toAddressList } from "@/server/dto/address";
import { json } from "@/server/http/responses";
import { setDefaultAddress } from "@/server/services/address-service";

/** PUT /api/v1/addresses/:id/default: makes this the default address (the previous default is unset). */
export const PUT = customerRoute<{ id: string }>(
  { name: "addresses.default", rateLimit: { limit: 60, windowSec: 10 * 60 } },
  async ({ customer, params }) =>
    json(toAddressList(await setDefaultAddress(customer.id, params.id))),
);
