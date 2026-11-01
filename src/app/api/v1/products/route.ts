import { jsonPublic } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { catalogService } from "@/server/services/catalog-service";

/** GET /api/v1/products: every listed product plus the filter choices of the all-products page. */
export const GET = route({ name: "products.list" }, async () =>
  jsonPublic(await catalogService.getProductListing()),
);
