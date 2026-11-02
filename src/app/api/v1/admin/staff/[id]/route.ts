import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { getStaff, updateStaff } from "@/server/services/staff-admin-service";
import { updateStaffSchema } from "@/server/validation/staff-schemas";

/** GET /api/v1/admin/staff/:id. Super admin only. */
export const GET = staffRoute<{ id: string }>(
  { name: "admin.staff.get", permission: "super_admin" },
  async ({ params }) => json({ staff: await getStaff(uuidParam(params.id)) }),
);

/**
 * PATCH /api/v1/admin/staff/:id: names, roles, enable/disable, super admin flag.
 * Disabling signs the person out at once. The last active super admin cannot be
 * disabled or demoted, and nobody can do either to themselves. Super admin only.
 */
export const PATCH = staffRoute<{ id: string }>(
  { name: "admin.staff.update", permission: "super_admin" },
  async ({ json: readJson, params, admin }) =>
    json({
      staff: await updateStaff(
        admin,
        uuidParam(params.id),
        await readJson(updateStaffSchema),
      ),
    }),
);
