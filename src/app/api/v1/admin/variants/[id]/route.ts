import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { updateVariant } from "@/server/services/admin-product-service";
import { updateVariantSchema } from "@/server/validation/admin-product-schemas";

/**
 * PATCH /api/v1/admin/variants/:id: changes only what is sent. `active: false`
 * stops the variant being bought (carts show it as unavailable); a variant is never
 * deleted, so old orders keep pointing at it. Stock is changed under /admin/stock.
 */
export const PATCH = staffRoute<{ id: string }>(
  { name: "admin.variants.update", permission: "products.manage" },
  async ({ json: readJson, params, admin }) =>
    json({
      product: await updateVariant(
        admin,
        uuidParam(params.id),
        await readJson(updateVariantSchema),
      ),
    }),
);
