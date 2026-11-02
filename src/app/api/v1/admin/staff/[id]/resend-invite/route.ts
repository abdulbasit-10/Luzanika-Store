import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { resendInvite } from "@/server/services/staff-admin-service";

/** POST /api/v1/admin/staff/:id/resend-invite: a new invite link for someone who has not accepted yet. Super admin only. */
export const POST = staffRoute<{ id: string }>(
  {
    name: "admin.staff.resend-invite",
    permission: "super_admin",
    rateLimit: { limit: 30, windowSec: 60 * 60 },
  },
  async ({ params, admin }) =>
    json(await resendInvite(admin, uuidParam(params.id))),
);
