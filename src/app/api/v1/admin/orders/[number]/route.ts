import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { getAdminOrder } from "@/server/services/admin-order-service";

/** GET /api/v1/admin/orders/:number: everything about one order, including its history, payments and refunds. */
export const GET = staffRoute<{ number: string }>(
  { name: "admin.orders.get", permission: "orders.view" },
  async ({ params }) => json({ order: await getAdminOrder(params.number) }),
);
