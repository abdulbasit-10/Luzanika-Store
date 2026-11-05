import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json, noContent } from "@/server/http/responses";
import {
  deleteDiscount,
  getDiscount,
  updateDiscount,
} from "@/server/services/admin-discount-service";
import { updateDiscountSchema } from "@/server/validation/admin-discount-schemas";

/** GET /api/v1/admin/discounts/:id: the discount and the products it covers. */
export const GET = staffRoute<{ id: string }>(
  { name: "admin.discounts.get", permission: "discounts.view" },
  async ({ params }) =>
    json({ discount: await getDiscount(uuidParam(params.id)) }),
);

/** PATCH /api/v1/admin/discounts/:id changes only the fields sent (also the on/off switch and the product list). */
export const PATCH = staffRoute<{ id: string }>(
  {
    name: "admin.discounts.update",
    permission: "discounts.manage",
    rateLimit: { limit: 200, windowSec: 10 * 60 },
  },
  async ({ json: readJson, params, admin }) =>
    json({
      discount: await updateDiscount(
        admin,
        uuidParam(params.id),
        await readJson(updateDiscountSchema),
      ),
    }),
);

/** DELETE /api/v1/admin/discounts/:id removes the discount. Orders already placed keep their prices. */
export const DELETE = staffRoute<{ id: string }>(
  {
    name: "admin.discounts.delete",
    permission: "discounts.manage",
    rateLimit: { limit: 120, windowSec: 10 * 60 },
  },
  async ({ params, admin }) => {
    await deleteDiscount(admin, uuidParam(params.id));
    return noContent();
  },
);
