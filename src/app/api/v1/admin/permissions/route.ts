import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { listPermissionCatalogue } from "@/server/services/staff-admin-service";

/** GET /api/v1/admin/permissions: every permission a role can allow, with a description, for building the role form. Super admin only. */
export const GET = staffRoute(
  { name: "admin.permissions.list", permission: "super_admin" },
  () => json({ items: listPermissionCatalogue() }),
);
