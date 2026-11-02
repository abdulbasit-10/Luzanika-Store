import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { getHomeSections } from "@/server/services/admin-catalog-service";

/** GET /api/v1/admin/home-sections: the products shown in each home page section ("featured", "new-arrivals", "special-offers"), in order. */
export const GET = staffRoute(
  {
    name: "admin.home.get",
    permission: ["products.view", "catalog.manage"],
  },
  async () => json({ items: await getHomeSections() }),
);
