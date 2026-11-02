import { staffRoute } from "@/server/auth/staff-route";
import { created, json } from "@/server/http/responses";
import {
  createCategory,
  listCategories,
} from "@/server/services/admin-catalog-service";
import { createCategorySchema } from "@/server/validation/admin-catalog-schemas";

/** GET /api/v1/admin/categories: every category with its subcategories and the collections it offers as a filter. */
export const GET = staffRoute(
  {
    name: "admin.categories.list",
    permission: ["products.view", "catalog.manage"],
  },
  async () => json({ items: await listCategories() }),
);

/**
 * POST /api/v1/admin/categories: a new category page. Prices (priceMin, priceMax,
 * priceStep) are minor units. Pictures are paths on this site, like /images/men-hero.jpg.
 */
export const POST = staffRoute(
  { name: "admin.categories.create", permission: "catalog.manage" },
  async ({ json: readJson, admin }) => {
    const category = await createCategory(
      admin,
      await readJson(createCategorySchema),
    );
    return created({ category }, `/api/v1/admin/categories/${category.id}`);
  },
);
