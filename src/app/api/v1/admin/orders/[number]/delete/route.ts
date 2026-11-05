import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { deleteOrder } from "@/server/services/admin-order-service";

/**
 * POST /api/v1/admin/orders/:number/delete hides a cancelled order from the
 * order list. The order and its history stay. Any other order is 409 `conflict`
 * (a delivered order is locked).
 */
export const POST = staffRoute<{ number: string }>(
  {
    name: "admin.orders.delete",
    permission: "orders.manage",
    rateLimit: { limit: 120, windowSec: 10 * 60 },
  },
  async ({ params, admin }) =>
    json({ order: await deleteOrder(admin, params.number) }),
);
