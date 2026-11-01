import { ApiError } from "@/server/http/api-error";
import { jsonPublic } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { catalogService } from "@/server/services/catalog-service";
import { isSlug } from "@/server/validation/catalog-schemas";

/** GET /api/v1/categories/:slug: one category page: its definition, filter choices and products. */
export const GET = route<{ slug: string }>(
  { name: "categories.get" },
  async ({ params }) => {
    const catalog = isSlug(params.slug)
      ? await catalogService.getCatalog(params.slug)
      : undefined;
    if (!catalog) throw new ApiError("not_found");
    return jsonPublic(catalog);
  },
);
