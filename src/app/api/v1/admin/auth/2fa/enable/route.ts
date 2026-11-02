import { setStaffCookie } from "@/server/auth/staff-cookie";
import { staffRoute } from "@/server/auth/staff-route";
import { json as jsonResponse } from "@/server/http/responses";
import { confirmTwoFactorSetup } from "@/server/services/staff-auth-service";
import { twoFactorEnableSchema } from "@/server/validation/staff-schemas";
import { readStaffToken } from "@/server/auth/staff-cookie";

/**
 * POST /api/v1/admin/auth/2fa/enable { code }: confirms the authenticator with
 * its first code. Finishes the sign-in and returns the recovery codes, which
 * are shown only this once.
 */
export const POST = staffRoute(
  { name: "admin.auth.2fa.enable", stage: "pending" },
  async ({ json, principal, request, ip, rateLimit }) => {
    // Wrong codes are limited per person, whatever address they come from.
    rateLimit({
      name: "admin.auth.2fa.enable",
      key: principal.staff.id,
      limit: 10,
      windowSec: 15 * 60,
    });
    const { code } = await json(twoFactorEnableSchema);

    const { recoveryCodes, expiresAt } = await confirmTwoFactorSetup(
      principal,
      code,
      { userAgent: request.headers.get("user-agent"), ip },
    );

    const response = jsonResponse({ recoveryCodes });
    setStaffCookie(response, readStaffToken(request)!, expiresAt);
    return response;
  },
);
