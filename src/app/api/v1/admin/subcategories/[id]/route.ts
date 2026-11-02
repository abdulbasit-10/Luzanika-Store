import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json, noContent } from "@/server/http/responses";
import {
  deleteSubcategory,
  updateSubcategory,
} from "@/server/services/admin-catalog-service";
import { updateSubcategorySchema } from "@/server/validation/admin-catalog-schemas";

export const PATCH = staffRoute<{ id: string }>(
  { name: "admin.subcategories.update", permission: "catalog.manage" },
  async ({ json: readJson, params, admin }) =>
    json({
      subcategory: await updateSubcategory(
        admin,
        uuidParam(params.id),
        await readJson(updateSubcategorySchema),
      ),
    }),
);

/** DELETE /api/v1/admin/subcategories/:id: refused (409) while any product still belongs to it. */
export const DELETE = staffRoute<{ id: string }>(
  { name: "admin.subcategories.delete", permission: "catalog.manage" },
  async ({ params, admin }) => {
    await deleteSubcategory(admin, uuidParam(params.id));
    return noContent();
  },
);
