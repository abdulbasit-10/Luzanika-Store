import { staffRoute } from "@/server/auth/staff-route";
import { noContent } from "@/server/http/responses";
import { changePassword } from "@/server/services/staff-auth-service";
import { staffChangePasswordSchema } from "@/server/validation/staff-schemas";

/** POST /api/v1/admin/auth/change-password: needs the current password. Signs out every other browser. */
export const POST = staffRoute(
  {
    name: "admin.auth.change-password",
    rateLimit: { limit: 10, windowSec: 15 * 60 },
  },
  async ({ json, principal }) => {
    const body = await json(staffChangePasswordSchema);
    await changePassword({ principal, ...body });
    return noContent();
  },
);
