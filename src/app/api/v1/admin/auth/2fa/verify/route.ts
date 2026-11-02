import { readStaffToken, setStaffCookie } from "@/server/auth/staff-cookie";
import { staffRoute } from "@/server/auth/staff-route";
import { json as jsonResponse } from "@/server/http/responses";
import { verifyTwoFactor } from "@/server/services/staff-auth-service";
import { twoFactorVerifySchema } from "@/server/validation/staff-schemas";

/**
 * POST /api/v1/admin/auth/2fa/verify { code } or { recoveryCode }: step two of
 * signing in. Five wrong tries per person in 15 minutes, whatever address
 * they come from. A recovery code works once.
 */
export const POST = staffRoute(
  { name: "admin.auth.2fa.verify", stage: "pending" },
  async ({ json, principal, request, ip, rateLimit }) => {
    rateLimit({
      name: "admin.auth.2fa.verify",
      key: principal.staff.id,
      limit: 5,
      windowSec: 15 * 60,
    });
    const body = await json(twoFactorVerifySchema);

    const { expiresAt, recoveryCodesLeft } = await verifyTwoFactor(
      principal,
      body,
      { userAgent: request.headers.get("user-agent"), ip },
    );

    const response = jsonResponse({
      ok: true,
      ...(recoveryCodesLeft !== undefined ? { recoveryCodesLeft } : {}),
    });
    setStaffCookie(response, readStaffToken(request)!, expiresAt);
    return response;
  },
);
