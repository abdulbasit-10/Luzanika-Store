import { noContent } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { acceptInvite } from "@/server/services/staff-auth-service";
import { staffResetPasswordSchema } from "@/server/validation/staff-schemas";

/** POST /api/v1/admin/auth/accept-invite { token, password }: an invited person chooses their password. They then sign in and set up their authenticator. */
export const POST = route(
  {
    name: "admin.auth.accept-invite",
    rateLimit: { limit: 10, windowSec: 15 * 60 },
  },
  async ({ json }) => {
    const body = await json(staffResetPasswordSchema);
    await acceptInvite({ token: body.token, password: body.password });
    return noContent();
  },
);
