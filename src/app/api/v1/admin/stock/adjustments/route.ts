import { staffRoute } from "@/server/auth/staff-route";
import { created } from "@/server/http/responses";
import { adjustStock } from "@/server/services/admin-stock-service";
import { adjustStockSchema } from "@/server/validation/stock-schemas";

/**
 * POST /api/v1/admin/stock/adjustments changes the stock of one variant in one market:
 *   { variantId, market, delta: 5, reason?: "adjustment", note? }     add (or, if negative, remove) units
 *   { variantId, market, setTo: 40, reason?, note? }                  the shelf now holds exactly 40
 * `reason` is "adjustment" (default) or "correction" (a counting mistake; needs a note).
 * Refused when it would take the shelf below what unpaid orders are holding.
 */
export const POST = staffRoute(
  {
    name: "admin.stock.adjust",
    permission: "stock.adjust",
    rateLimit: { limit: 300, windowSec: 10 * 60 },
  },
  async ({ json: readJson, admin }) => {
    const stock = await adjustStock(admin, await readJson(adjustStockSchema));
    return created(
      { stock },
      `/api/v1/admin/stock?productId=${stock.productId}`,
    );
  },
);
