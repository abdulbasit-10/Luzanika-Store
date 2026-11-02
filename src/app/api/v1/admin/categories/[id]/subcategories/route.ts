import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { created } from "@/server/http/responses";
import { createSubcategory } from "@/server/services/admin-catalog-service";
import { createSubcategorySchema } from "@/server/validation/admin-catalog-schemas";

/** POST /api/v1/admin/categories/:id/subcategories { slug, label, shortLabel?, sort? }: a new pill on the category page. */
export const POST = staffRoute<{ id: string }>(
  { name: "admin.subcategories.create", permission: "catalog.manage" },
  async ({ json: readJson, params, admin }) => {
    const subcategory = await createSubcategory(
      admin,
      uuidParam(params.id),
      await readJson(createSubcategorySchema),
    );
    return created(
      { subcategory },
      `/api/v1/admin/subcategories/${subcategory.id}`,
    );
  },
);
