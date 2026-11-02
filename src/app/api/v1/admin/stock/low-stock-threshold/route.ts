import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { setLowStockThreshold } from "@/server/services/admin-stock-service";
import { thresholdSchema } from "@/server/validation/stock-schemas";

/** PATCH /api/v1/admin/stock/low-stock-threshold { variantId, market, lowStockThreshold }: when this variant counts as "low on stock" in this market. */
export const PATCH = staffRoute(
  {
    name: "admin.stock.threshold",
    permission: "stock.adjust",
    rateLimit: { limit: 300, windowSec: 10 * 60 },
  },
  async ({ json: readJson, admin }) => {
    const { lowStockThreshold, ...rest } = await readJson(thresholdSchema);
    return json({
      stock: await setLowStockThreshold(admin, {
        ...rest,
        threshold: lowStockThreshold,
      }),
    });
  },
);
