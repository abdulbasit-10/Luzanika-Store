import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { listAudit } from "@/server/audit/audit";
import { auditListQuerySchema } from "@/server/validation/admin-dashboard-schemas";

/**
 * GET /api/v1/admin/audit: the log of every change staff made, newest first.
 * Filters: staffId, entityType (e.g. order, product, staff), entityId, action
 * (e.g. orders.status_change), from / to, page, pageSize (default 25, at most 100).
 * Rows never contain passwords or 2FA secrets. Super admin only.
 */
export const GET = staffRoute(
  { name: "admin.audit.list", permission: "super_admin" },
  async ({ query }) => {
    const { page, pageSize, ...filter } = query(auditListQuerySchema);
    const { items, total } = await listAudit(
      filter,
      pageSize,
      (page - 1) * pageSize,
    );
    return json({
      items: items.map((row) => ({
        id: row.id,
        at: new Date(row.at).toISOString(),
        staffId: row.staffId,
        staffEmail: row.staffEmail,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        before: row.before,
        after: row.after,
        requestId: row.requestId,
      })),
      total,
      page,
      pageSize,
    });
  },
);
