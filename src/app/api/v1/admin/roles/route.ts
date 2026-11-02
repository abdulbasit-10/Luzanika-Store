import { staffRoute } from "@/server/auth/staff-route";
import { created, json } from "@/server/http/responses";
import { createRole, listRoles } from "@/server/services/staff-admin-service";
import { createRoleSchema } from "@/server/validation/staff-schemas";

/** GET /api/v1/admin/roles: every role with its permissions and how many people have it. Super admin only. */
export const GET = staffRoute(
  { name: "admin.roles.list", permission: "super_admin" },
  async () => json({ items: await listRoles() }),
);

/** POST /api/v1/admin/roles { name, description?, permissions[] }. Super admin only. */
export const POST = staffRoute(
  { name: "admin.roles.create", permission: "super_admin" },
  async ({ json: readJson, admin }) => {
    const role = await createRole(admin, await readJson(createRoleSchema));
    return created({ role }, `/api/v1/admin/roles/${role.id}`);
  },
);
