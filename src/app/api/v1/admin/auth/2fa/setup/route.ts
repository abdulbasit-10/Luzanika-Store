import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { beginTwoFactorSetup } from "@/server/services/staff-auth-service";

/**
 * POST /api/v1/admin/auth/2fa/setup: for a person who has no authenticator
 * yet. Returns the secret and the `otpauth://` link to show as a QR code.
 * Asking again makes a new secret, until the first code is confirmed.
 */
export const POST = staffRoute(
  {
    name: "admin.auth.2fa.setup",
    stage: "pending",
    rateLimit: { limit: 10, windowSec: 15 * 60 },
  },
  async ({ principal }) => json(await beginTwoFactorSetup(principal)),
);
