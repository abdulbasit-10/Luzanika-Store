import { staffRoute } from "@/server/auth/staff-route";
import { created, json } from "@/server/http/responses";
import {
  createProduct,
  listProducts,
} from "@/server/services/admin-product-service";
import {
  createProductSchema,
  productListQuerySchema,
} from "@/server/validation/admin-product-schemas";

/**
 * GET /api/v1/admin/products: products with their first photo, prices per
 * market and what can be sold. Filters: search (name, slug, SKU), status,
 * categoryId, listed, deleted (exclude by default, include, only), page, pageSize.
 */
export const GET = staffRoute(
  { name: "admin.products.list", permission: "products.view" },
  async ({ query }) => {
    const { page, pageSize, ...filter } = query(productListQuerySchema);
    return json(await listProducts(filter, page, pageSize));
  },
);

/**
 * POST /api/v1/admin/products: a new product, always a draft. Add its prices,
 * variants and photos, then PATCH status to "active". Leave `slug` out to make
 * one from the name.
 */
export const POST = staffRoute(
  {
    name: "admin.products.create",
    permission: "products.manage",
    rateLimit: { limit: 120, windowSec: 10 * 60 },
  },
  async ({ json: readJson, admin }) => {
    const product = await createProduct(admin, await readJson(createProductSchema));
    return created({ product }, `/api/v1/admin/products/${product.id}`);
  },
);
