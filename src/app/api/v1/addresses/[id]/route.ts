import { customerRoute } from "@/server/auth/customer-route";
import { toAddressDto, toAddressList } from "@/server/dto/address";
import { json } from "@/server/http/responses";
import {
  deleteAddress,
  updateAddress,
} from "@/server/services/address-service";
import { updateAddressSchema } from "@/server/validation/address-schemas";

/** PATCH /api/v1/addresses/:id: changes the fields that are sent. Another customer's address is "not found". */
export const PATCH = customerRoute<{ id: string }>(
  { name: "addresses.update", rateLimit: { limit: 60, windowSec: 10 * 60 } },
  async ({ json: readJson, customer, params }) => {
    const body = await readJson(updateAddressSchema);
    const { address, items } = await updateAddress(
      customer.id,
      params.id,
      body,
    );
    return json({ address: toAddressDto(address), ...toAddressList(items) });
  },
);

/** DELETE /api/v1/addresses/:id: removes the address. If it was the default, the oldest remaining one takes over. */
export const DELETE = customerRoute<{ id: string }>(
  { name: "addresses.delete", rateLimit: { limit: 60, windowSec: 10 * 60 } },
  async ({ customer, params }) =>
    json(toAddressList(await deleteAddress(customer.id, params.id))),
);
