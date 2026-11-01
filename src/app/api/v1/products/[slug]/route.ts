import { ApiError } from "@/server/http/api-error";
import { jsonPublic } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { catalogService } from "@/server/services/catalog-service";
import { isSlug } from "@/server/validation/catalog-schemas";

/** GET /api/v1/products/:slug: one product page, with prices and stock for both markets. */
export const GET = route<{ slug: string }>(
  { name: "products.get" },
  async ({ params }) => {
    const product = isSlug(params.slug)
      ? await catalogService.getProduct(params.slug)
      : undefined;
    if (!product) throw new ApiError("not_found");
    return jsonPublic(product);
  },
);
