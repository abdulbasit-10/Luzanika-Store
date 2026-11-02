import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json, noContent } from "@/server/http/responses";
import { deleteRole, updateRole } from "@/server/services/staff-admin-service";
import { updateRoleSchema } from "@/server/validation/staff-schemas";

/** PATCH /api/v1/admin/roles/:id: name, description, permissions. Takes effect at once for everyone who has the role. Super admin only. */
export const PATCH = staffRoute<{ id: string }>(
  { name: "admin.roles.update", permission: "super_admin" },
  async ({ json: readJson, params, admin }) =>
    json({
      role: await updateRole(
        admin,
        uuidParam(params.id),
        await readJson(updateRoleSchema),
      ),
    }),
);

/** DELETE /api/v1/admin/roles/:id: refused (409) while anyone still has the role. Super admin only. */
export const DELETE = staffRoute<{ id: string }>(
  { name: "admin.roles.delete", permission: "super_admin" },
  async ({ params, admin }) => {
    await deleteRole(admin, uuidParam(params.id));
    return noContent();
  },
);
