import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { changeOrderStatus } from "@/server/services/admin-order-service";
import { changeOrderStatusSchema } from "@/server/validation/admin-order-schemas";

/**
 * POST /api/v1/admin/orders/:number/status moves an order along. Allowed moves
 * only (anything else is 409 `invalid_status_transition`):
 *   { "status": "in_delivery", "carrier": "...", "trackingNumber": "..." }   paid order -> in delivery
 *   { "status": "completed" }                                                in delivery -> completed
 *   { "status": "cancelled", "reason": "..." }                               unpaid order -> cancelled (stock goes back)
 * The customer is emailed. A paid order is not cancelled here: record a refund.
 */
export const POST = staffRoute<{ number: string }>(
  {
    name: "admin.orders.status",
    permission: "orders.manage",
    rateLimit: { limit: 120, windowSec: 10 * 60 },
  },
  async ({ json: readJson, params, admin }) =>
    json({
      order: await changeOrderStatus(
        admin,
        params.number,
        await readJson(changeOrderStatusSchema),
      ),
    }),
);
