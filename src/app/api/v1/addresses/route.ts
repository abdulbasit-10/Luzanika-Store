import { customerRoute } from "@/server/auth/customer-route";
import { toAddressDto, toAddressList } from "@/server/dto/address";
import { created, json } from "@/server/http/responses";
import {
  createAddress,
  listAddresses,
} from "@/server/services/address-service";
import { createAddressSchema } from "@/server/validation/address-schemas";

/** GET /api/v1/addresses: the signed-in customer's address book, oldest first. */
export const GET = customerRoute(
  { name: "addresses.list" },
  async ({ customer }) => json(toAddressList(await listAddresses(customer.id))),
);

/** POST /api/v1/addresses: saves a new address. The first one is always the default. */
export const POST = customerRoute(
  { name: "addresses.create", rateLimit: { limit: 60, windowSec: 10 * 60 } },
  async ({ json: readJson, customer }) => {
    const body = await readJson(createAddressSchema);
    const { address, items } = await createAddress(customer.id, body);
    return created(
      { address: toAddressDto(address), ...toAddressList(items) },
      `/api/v1/addresses/${address.id}`,
    );
  },
);
