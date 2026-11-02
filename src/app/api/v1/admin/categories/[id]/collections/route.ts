import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { setCategoryCollections } from "@/server/services/admin-catalog-service";
import { setCategoryCollectionsSchema } from "@/server/validation/admin-catalog-schemas";

/** PUT /api/v1/admin/categories/:id/collections { collectionIds: [...] }: the "Category" filter choices of this page, in this order (replaces the old list). */
export const PUT = staffRoute<{ id: string }>(
  { name: "admin.categories.collections", permission: "catalog.manage" },
  async ({ json: readJson, params, admin }) =>
    json({
      category: await setCategoryCollections(
        admin,
        uuidParam(params.id),
        (await readJson(setCategoryCollectionsSchema)).collectionIds,
      ),
    }),
);
