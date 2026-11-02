import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json, noContent } from "@/server/http/responses";
import {
  deleteCategory,
  getCategory,
  updateCategory,
} from "@/server/services/admin-catalog-service";
import { updateCategorySchema } from "@/server/validation/admin-catalog-schemas";

export const GET = staffRoute<{ id: string }>(
  {
    name: "admin.categories.get",
    permission: ["products.view", "catalog.manage"],
  },
  async ({ params }) =>
    json({ category: await getCategory(uuidParam(params.id)) }),
);

/** PATCH /api/v1/admin/categories/:id: changes only what is sent. */
export const PATCH = staffRoute<{ id: string }>(
  { name: "admin.categories.update", permission: "catalog.manage" },
  async ({ json: readJson, params, admin }) =>
    json({
      category: await updateCategory(
        admin,
        uuidParam(params.id),
        await readJson(updateCategorySchema),
      ),
    }),
);

/** DELETE /api/v1/admin/categories/:id: refused (409) while any product still belongs to it. */
export const DELETE = staffRoute<{ id: string }>(
  { name: "admin.categories.delete", permission: "catalog.manage" },
  async ({ params, admin }) => {
    await deleteCategory(admin, uuidParam(params.id));
    return noContent();
  },
);
