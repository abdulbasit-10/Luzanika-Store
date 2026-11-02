import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { setPrices } from "@/server/services/admin-product-service";
import { setPricesSchema } from "@/server/validation/admin-product-schemas";

/**
 * PUT /api/v1/admin/products/:id/prices { PK?: { amount, compareAtAmount? } | null, DE?: ... }
 * sets the price per market, in minor units (paisa / cents). A market left out is
 * not touched; null removes the price (the product is then not sold there).
 * `compareAtAmount` is the old price shown struck through and must be higher.
 */
export const PUT = staffRoute<{ id: string }>(
  { name: "admin.products.prices", permission: "products.manage" },
  async ({ json: readJson, params, admin }) =>
    json({
      product: await setPrices(
        admin,
        uuidParam(params.id),
        await readJson(setPricesSchema),
      ),
    }),
);
