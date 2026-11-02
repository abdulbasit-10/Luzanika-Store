import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { listMovements } from "@/server/services/admin-stock-service";
import { movementListQuerySchema } from "@/server/validation/stock-schemas";

/**
 * GET /api/v1/admin/stock/movements: the stock ledger, newest first. Every
 * change is there: sales, returns and staff adjustments (with who and why).
 * Filters: variantId, market, reason, from / to, page, pageSize.
 */
export const GET = staffRoute(
  { name: "admin.stock.movements", permission: "stock.view" },
  async ({ query }) => {
    const { page, pageSize, ...filter } = query(movementListQuerySchema);
    return json(await listMovements(filter, page, pageSize));
  },
);
