import { staffRoute } from "@/server/auth/staff-route";
import { created, json } from "@/server/http/responses";
import {
  createCollection,
  listCollections,
} from "@/server/services/admin-catalog-service";
import { createCollectionSchema } from "@/server/validation/admin-catalog-schemas";

/** GET /api/v1/admin/collections: the choices of the sidebar "Category" filter (e.g. "Men Casual"), with how many products are in each. */
export const GET = staffRoute(
  {
    name: "admin.collections.list",
    permission: ["products.view", "catalog.manage"],
  },
  async () => json({ items: await listCollections() }),
);

export const POST = staffRoute(
  { name: "admin.collections.create", permission: "catalog.manage" },
  async ({ json: readJson, admin }) => {
    const collection = await createCollection(
      admin,
      await readJson(createCollectionSchema),
    );
    return created(
      { collection },
      `/api/v1/admin/collections/${collection.id}`,
    );
  },
);
