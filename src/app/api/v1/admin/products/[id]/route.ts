import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import {
  deleteProduct,
  getProduct,
  updateProduct,
} from "@/server/services/admin-product-service";
import { updateProductSchema } from "@/server/validation/admin-product-schemas";

/** GET /api/v1/admin/products/:id: everything about one product, including photos, variants with stock per market, prices and detail cards. */
export const GET = staffRoute<{ id: string }>(
  { name: "admin.products.get", permission: "products.view" },
  async ({ params }) => json({ product: await getProduct(uuidParam(params.id)) }),
);

/**
 * PATCH /api/v1/admin/products/:id: changes only what is sent. `status: "active"`
 * needs at least one price and one active variant (otherwise 409). A deleted
 * product cannot be changed until it is restored.
 */
export const PATCH = staffRoute<{ id: string }>(
  { name: "admin.products.update", permission: "products.manage" },
  async ({ json: readJson, params, admin }) =>
    json({
      product: await updateProduct(
        admin,
        uuidParam(params.id),
        await readJson(updateProductSchema),
      ),
    }),
);

/** DELETE /api/v1/admin/products/:id: hides the product from the shop. It is kept (with its orders) and can be restored. */
export const DELETE = staffRoute<{ id: string }>(
  { name: "admin.products.delete", permission: "products.delete" },
  async ({ params, admin }) =>
    json({ product: await deleteProduct(admin, uuidParam(params.id)) }),
);
