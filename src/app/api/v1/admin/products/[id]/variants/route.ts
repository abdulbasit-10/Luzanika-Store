import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { created } from "@/server/http/responses";
import { addVariant } from "@/server/services/admin-product-service";
import { createVariantSchema } from "@/server/validation/admin-product-schemas";

/**
 * POST /api/v1/admin/products/:id/variants { sku, colorName?, colorHex?, sizeLabel?, sort?, active?, stock?: { PK?, DE? } }
 * adds one sellable combination of colour and size. `stock` is the first number of
 * units on the shelf per market (recorded in the stock ledger). A product cannot have
 * the same colour and size twice, and SKUs are unique.
 */
export const POST = staffRoute<{ id: string }>(
  {
    name: "admin.variants.create",
    permission: "products.manage",
    rateLimit: { limit: 300, windowSec: 10 * 60 },
  },
  async ({ json: readJson, params, admin }) => {
    const id = uuidParam(params.id);
    const product = await addVariant(admin, id, await readJson(createVariantSchema));
    return created({ product }, `/api/v1/admin/products/${id}`);
  },
);
