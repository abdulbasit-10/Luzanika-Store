import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { listCustomers } from "@/server/services/admin-customer-service";
import { customerListQuerySchema } from "@/server/validation/admin-customer-schemas";

/** GET /api/v1/admin/customers: newest first. Filters: search (email, name, phone), status (active, blocked, anonymised), page, pageSize. */
export const GET = staffRoute(
  { name: "admin.customers.list", permission: "customers.view" },
  async ({ query }) => {
    const { page, pageSize, ...filter } = query(customerListQuerySchema);
    return json(await listCustomers(filter, page, pageSize));
  },
);
