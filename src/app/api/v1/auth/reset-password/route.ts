import { noContent } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { resetPassword } from "@/server/services/auth-service";
import { resetPasswordSchema } from "@/server/validation/auth-schemas";

/** POST /api/v1/auth/reset-password: sets a new password from an emailed link, once. Signs out every device. */
export const POST = route(
  { name: "auth.reset-password", rateLimit: { limit: 10, windowSec: 60 * 60 } },
  async ({ json }) => {
    const { token, password } = await json(resetPasswordSchema);
    await resetPassword({ token, newPassword: password });
    return noContent();
  },
);
