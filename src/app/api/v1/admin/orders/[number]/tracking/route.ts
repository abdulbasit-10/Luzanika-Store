import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { updateDelivery } from "@/server/services/admin-order-service";
import { updateTrackingSchema } from "@/server/validation/admin-order-schemas";

/** PATCH /api/v1/admin/orders/:number/tracking { carrier, trackingNumber }: corrects the delivery details while the order is in delivery. The customer is not emailed again. */
export const PATCH = staffRoute<{ number: string }>(
  {
    name: "admin.orders.tracking",
    permission: "orders.manage",
    rateLimit: { limit: 120, windowSec: 10 * 60 },
  },
  async ({ json: readJson, params, admin }) =>
    json({
      order: await updateDelivery(
        admin,
        params.number,
        await readJson(updateTrackingSchema),
      ),
    }),
);
