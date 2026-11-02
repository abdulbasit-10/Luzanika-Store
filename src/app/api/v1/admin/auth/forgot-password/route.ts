import { noContent } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { fingerprint } from "@/server/security/tokens";
import { requestPasswordReset } from "@/server/services/staff-auth-service";
import { staffForgotPasswordSchema } from "@/server/validation/staff-schemas";

/**
 * POST /api/v1/admin/auth/forgot-password: emails a reset link to an active
 * staff member. It answers 204 whether or not the address belongs to staff,
 * so the form cannot be used to find out who works here.
 */
export const POST = route(
  {
    name: "admin.auth.forgot-password",
    rateLimit: { limit: 5, windowSec: 60 * 60 },
  },
  async ({ json, rateLimit }) => {
    const { email } = await json(staffForgotPasswordSchema);

    rateLimit({
      name: "admin.auth.forgot-password.account",
      key: fingerprint(email),
      limit: 3,
      windowSec: 60 * 60,
    });

    await requestPasswordReset(email);
    return noContent();
  },
);
