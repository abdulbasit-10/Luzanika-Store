import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { setSections } from "@/server/services/admin-product-service";
import { setSectionsSchema } from "@/server/validation/admin-product-schemas";

/** PUT /api/v1/admin/products/:id/sections { sections: [{ title, body }] }: the detail cards of the product page (Description, Material, ...), exactly these and in this order. */
export const PUT = staffRoute<{ id: string }>(
  { name: "admin.products.sections", permission: "products.manage" },
  async ({ json: readJson, params, admin }) =>
    json({
      product: await setSections(
        admin,
        uuidParam(params.id),
        (await readJson(setSectionsSchema)).sections,
      ),
    }),
);
