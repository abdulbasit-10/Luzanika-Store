import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import {
  createDiscount,
  listDiscounts,
} from "@/server/services/admin-discount-service";
import {
  adminDiscountListQuerySchema,
  createDiscountSchema,
} from "@/server/validation/admin-discount-schemas";

/** GET /api/v1/admin/discounts: newest first. Filters: status (active, scheduled, ended, off), search (name), page, pageSize. */
export const GET = staffRoute(
  { name: "admin.discounts.list", permission: "discounts.view" },
  async ({ query }) => {
    const { page, pageSize, ...filter } = query(adminDiscountListQuerySchema);
    return json(await listDiscounts(filter, page, pageSize));
  },
);

/**
 * POST /api/v1/admin/discounts { name, percent (1 to 90), markets, startsAt?, endsAt?, active?, productIds }
 * makes a discount. It applies to those products in those markets between the two dates.
 */
export const POST = staffRoute(
  {
    name: "admin.discounts.create",
    permission: "discounts.manage",
    rateLimit: { limit: 120, windowSec: 10 * 60 },
  },
  async ({ json: readJson, admin }) =>
    json(
      {
        discount: await createDiscount(
          admin,
          await readJson(createDiscountSchema),
        ),
      },
      { status: 201 },
    ),
);
