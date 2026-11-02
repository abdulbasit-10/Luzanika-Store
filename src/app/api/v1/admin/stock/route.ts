import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { listStock } from "@/server/services/admin-stock-service";
import { stockListQuerySchema } from "@/server/validation/stock-schemas";

/**
 * GET /api/v1/admin/stock: stock per variant and market (every variant appears
 * in both markets; one with no record yet shows 0 and `hasRecord: false`).
 * Filters: market, productId, search (product, SKU, colour, size), lowOnly=true,
 * page, pageSize.
 */
export const GET = staffRoute(
  { name: "admin.stock.list", permission: "stock.view" },
  async ({ query }) => {
    const { page, pageSize, ...filter } = query(stockListQuerySchema);
    return json(await listStock(filter, page, pageSize));
  },
);
