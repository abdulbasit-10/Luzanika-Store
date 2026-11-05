import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { listProductOptions } from "@/server/services/admin-discount-service";
import { discountProductQuerySchema } from "@/server/validation/admin-discount-schemas";

/** GET /api/v1/admin/discounts/products?search=: up to 20 products to pick from (name, slug or SKU). */
export const GET = staffRoute(
  { name: "admin.discounts.products", permission: "discounts.view" },
  async ({ query }) =>
    json({
      items: await listProductOptions(query(discountProductQuerySchema).search),
    }),
);
