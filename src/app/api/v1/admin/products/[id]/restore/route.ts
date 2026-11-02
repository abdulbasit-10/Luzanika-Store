import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { restoreProduct } from "@/server/services/admin-product-service";

/** POST /api/v1/admin/products/:id/restore: brings a deleted product back as a draft, to be checked before it goes on sale again. */
export const POST = staffRoute<{ id: string }>(
  { name: "admin.products.restore", permission: "products.delete" },
  async ({ params, admin }) =>
    json({ product: await restoreProduct(admin, uuidParam(params.id)) }),
);
