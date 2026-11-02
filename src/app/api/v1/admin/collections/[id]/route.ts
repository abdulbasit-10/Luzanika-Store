import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json, noContent } from "@/server/http/responses";
import {
  deleteCollection,
  updateCollection,
} from "@/server/services/admin-catalog-service";
import { updateCollectionSchema } from "@/server/validation/admin-catalog-schemas";

export const PATCH = staffRoute<{ id: string }>(
  { name: "admin.collections.update", permission: "catalog.manage" },
  async ({ json: readJson, params, admin }) =>
    json({
      collection: await updateCollection(
        admin,
        uuidParam(params.id),
        await readJson(updateCollectionSchema),
      ),
    }),
);

/** DELETE /api/v1/admin/collections/:id: refused (409) while any product is in it. */
export const DELETE = staffRoute<{ id: string }>(
  { name: "admin.collections.delete", permission: "catalog.manage" },
  async ({ params, admin }) => {
    await deleteCollection(admin, uuidParam(params.id));
    return noContent();
  },
);
