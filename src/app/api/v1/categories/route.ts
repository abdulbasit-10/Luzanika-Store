import { jsonPublic } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { catalogService } from "@/server/services/catalog-service";

/** GET /api/v1/categories: the categories with their subcategory pills, in display order. */
export const GET = route({ name: "categories.list" }, async () =>
  jsonPublic({ items: await catalogService.listCategories() }),
);
