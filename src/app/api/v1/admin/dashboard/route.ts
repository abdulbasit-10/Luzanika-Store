import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { getDashboard } from "@/server/services/admin-dashboard-service";
import { dashboardQuerySchema } from "@/server/validation/admin-dashboard-schemas";

/**
 * GET /api/v1/admin/dashboard?market=&from=&to=: the numbers for the home screen.
 * The period defaults to the last 30 days up to and including today (UTC days;
 * at most 366 days). Per market it gives orders by status, orders paid, refunds,
 * revenue (paid minus refunds) and a per-day series. Pakistan and Germany are
 * never added together because their currencies differ. It also gives new
 * customers, the variants that are low on stock and the latest orders.
 */
export const GET = staffRoute(
  { name: "admin.dashboard", permission: "dashboard.view" },
  async ({ query }) => json(await getDashboard(query(dashboardQuerySchema))),
);
