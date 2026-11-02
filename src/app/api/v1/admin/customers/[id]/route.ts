import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { getCustomer } from "@/server/services/admin-customer-service";

/**
 * GET /api/v1/admin/customers/:id: the profile (never the password or sign-in
 * tokens), saved addresses, what they spent per currency, and their newest
 * 100 orders.
 */
export const GET = staffRoute<{ id: string }>(
  { name: "admin.customers.get", permission: "customers.view" },
  async ({ params }) =>
    json({ customer: await getCustomer(uuidParam(params.id)) }),
);
