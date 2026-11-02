import { staffRoute } from "@/server/auth/staff-route";
import { uuidParam } from "@/server/http/params";
import { json } from "@/server/http/responses";
import { resetTwoFactor } from "@/server/services/staff-admin-service";

/**
 * POST /api/v1/admin/staff/:id/reset-two-factor: for a lost phone. Removes the
 * authenticator and recovery codes and signs the person out, so they set up a
 * new authenticator at their next sign-in. Super admin only.
 */
export const POST = staffRoute<{ id: string }>(
  {
    name: "admin.staff.reset-two-factor",
    permission: "super_admin",
    rateLimit: { limit: 30, windowSec: 60 * 60 },
  },
  async ({ params, admin }) =>
    json({ staff: await resetTwoFactor(admin, uuidParam(params.id)) }),
);
