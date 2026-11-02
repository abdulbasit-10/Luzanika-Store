import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { unblockCustomer } from "@/server/services/admin-customer-service";
import { unblockCustomerSchema } from "@/server/validation/admin-customer-schemas";

/** POST /api/v1/admin/customers/:id/unblock { note? }: lets a blocked customer sign in again. */
export const POST = staffRoute<{ id: string }>(
  {
    name: "admin.customers.unblock",
    permission: "customers.manage",
    rateLimit: { limit: 60, windowSec: 10 * 60 },
  },
  async ({ json: readJson, params, admin }) =>
    json({
      customer: await unblockCustomer(
        admin,
        uuidParam(params.id),
        (await readJson(unblockCustomerSchema)).note ?? null,
      ),
    }),
);
