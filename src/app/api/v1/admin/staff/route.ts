import { staffRoute } from "@/server/auth/staff-route";
import { created, json } from "@/server/http/responses";
import { inviteStaff, listStaff } from "@/server/services/staff-admin-service";
import {
  inviteStaffSchema,
  staffListQuerySchema,
} from "@/server/validation/staff-schemas";

/** GET /api/v1/admin/staff?search=&status=: every staff member with their roles. Super admin only. */
export const GET = staffRoute(
  { name: "admin.staff.list", permission: "super_admin" },
  async ({ query }) =>
    json({ items: await listStaff(query(staffListQuerySchema)) }),
);

/**
 * POST /api/v1/admin/staff: invites someone by email. They get a link to choose
 * their password. `inviteEmailSent` is false when the email could not be sent
 * (the person is still invited; use resend-invite). Super admin only.
 */
export const POST = staffRoute(
  {
    name: "admin.staff.invite",
    permission: "super_admin",
    rateLimit: { limit: 30, windowSec: 60 * 60 },
  },
  async ({ json: readJson, admin }) => {
    const result = await inviteStaff(admin, await readJson(inviteStaffSchema));
    return created(result, `/api/v1/admin/staff/${result.staff.id}`);
  },
);
