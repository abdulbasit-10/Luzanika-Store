import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { reorderImages } from "@/server/services/admin-product-service";
import { reorderImagesSchema } from "@/server/validation/admin-product-schemas";

/** PUT /api/v1/admin/products/:id/images/order { ids: [...] }: every photo of the product in the new order. The first is the main photo. */
export const PUT = staffRoute<{ id: string }>(
  { name: "admin.products.images.order", permission: "products.manage" },
  async ({ json: readJson, params, admin }) =>
    json({
      product: await reorderImages(
        admin,
        uuidParam(params.id),
        (await readJson(reorderImagesSchema)).ids,
      ),
    }),
);
