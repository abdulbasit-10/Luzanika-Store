import { noContent } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { fingerprint } from "@/server/security/tokens";
import { requestPasswordReset } from "@/server/services/auth-service";
import { forgotPasswordSchema } from "@/server/validation/auth-schemas";

/**
 * POST /api/v1/auth/forgot-password: emails a reset link to the address the
 * account was registered with. An email with no account gets a clear
 * "not registered" answer (404 with a message on the email field).
 */
export const POST = route(
  { name: "auth.forgot-password", rateLimit: { limit: 5, windowSec: 60 * 60 } },
  async ({ json, rateLimit }) => {
    const { email } = await json(forgotPasswordSchema);

    // Limited per address whether or not the account exists, so it also slows anyone probing for addresses.
    rateLimit({
      name: "auth.forgot-password.account",
      key: fingerprint(email),
      limit: 3,
      windowSec: 60 * 60,
    });

    await requestPasswordReset(email);
    return noContent();
  },
);
