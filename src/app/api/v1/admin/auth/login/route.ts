import { setStaffCookie } from "@/server/auth/staff-cookie";
import { json as jsonResponse } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { fingerprint } from "@/server/security/tokens";
import { login } from "@/server/services/staff-auth-service";
import { staffLoginSchema } from "@/server/validation/staff-schemas";

/**
 * POST /api/v1/admin/auth/login: step one, the password. The answer says what
 * comes next ("two_factor_setup" for a new person, "two_factor_verify"
 * otherwise); the cookie it sets only allows finishing that step.
 */
export const POST = route(
  { name: "admin.auth.login", rateLimit: { limit: 20, windowSec: 15 * 60 } },
  async ({ json, request, ip, rateLimit }) => {
    const body = await json(staffLoginSchema);

    // Per account from this address, and per account from anywhere.
    rateLimit({
      name: "admin.auth.login.pair",
      key: fingerprint(`${ip}|${body.email}`),
      limit: 5,
      windowSec: 15 * 60,
    });
    rateLimit({
      name: "admin.auth.login.account",
      key: fingerprint(body.email),
      limit: 20,
      windowSec: 60 * 60,
    });

    const result = await login(body, {
      userAgent: request.headers.get("user-agent"),
      ip,
    });

    const response = jsonResponse({ next: result.next });
    setStaffCookie(response, result.token, result.expiresAt);
    return response;
  },
);
