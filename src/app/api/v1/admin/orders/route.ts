import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { listAdminOrders } from "@/server/services/admin-order-service";
import { adminOrderListQuerySchema } from "@/server/validation/admin-order-schemas";

/**
 * GET /api/v1/admin/orders: orders of both markets, newest first.
 * Filters: market, status, paymentStatus, from / to (a day like 2026-11-02, or a
 * full time; a plain `to` day includes that whole day), search (order number,
 * email or recipient name), page, pageSize (default 25, at most 100).
 * Amounts are minor units in each order's own currency; they are never added across markets.
 */
export const GET = staffRoute(
  { name: "admin.orders.list", permission: "orders.view" },
  async ({ query }) => {
    const { page, pageSize, ...filter } = query(adminOrderListQuerySchema);
    return json(await listAdminOrders(filter, page, pageSize));
  },
);
