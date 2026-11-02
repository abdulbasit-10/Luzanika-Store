import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { blockCustomer } from "@/server/services/admin-customer-service";
import { blockCustomerSchema } from "@/server/validation/admin-customer-schemas";

/**
 * POST /api/v1/admin/customers/:id/block { reason }: signs the customer out of
 * every browser at once and refuses their logins until unblocked. Their
 * orders, cart and wishlist are untouched.
 */
export const POST = staffRoute<{ id: string }>(
  {
    name: "admin.customers.block",
    permission: "customers.manage",
    rateLimit: { limit: 60, windowSec: 10 * 60 },
  },
  async ({ json: readJson, params, admin }) =>
    json({
      customer: await blockCustomer(
        admin,
        uuidParam(params.id),
        (await readJson(blockCustomerSchema)).reason,
      ),
    }),
);
