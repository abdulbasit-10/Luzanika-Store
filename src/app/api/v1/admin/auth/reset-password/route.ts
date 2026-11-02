import { noContent } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { resetPassword } from "@/server/services/staff-auth-service";
import { staffResetPasswordSchema } from "@/server/validation/staff-schemas";

/** POST /api/v1/admin/auth/reset-password { token, password }: sets a new password from the emailed link and signs out every browser. */
export const POST = route(
  {
    name: "admin.auth.reset-password",
    rateLimit: { limit: 10, windowSec: 15 * 60 },
  },
  async ({ json }) => {
    const body = await json(staffResetPasswordSchema);
    await resetPassword({ token: body.token, newPassword: body.password });
    return noContent();
  },
);
