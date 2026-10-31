import { setSessionCookie } from "@/server/auth/session-cookie";
import { toUserDto } from "@/server/dto/user";
import { json as jsonResponse } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { fingerprint } from "@/server/security/tokens";
import { login } from "@/server/services/auth-service";
import { loginSchema } from "@/server/validation/auth-schemas";

/** POST /api/v1/auth/login */
export const POST = route(
  // Per visitor: stops one address trying many accounts.
  { name: "auth.login", rateLimit: { limit: 20, windowSec: 15 * 60 } },
  async ({ json, request, ip, rateLimit }) => {
    const body = await json(loginSchema);

    // Per account from this address, and per account from anywhere (slows a spread-out guessing attack).
    rateLimit({
      name: "auth.login.pair",
      key: fingerprint(`${ip}|${body.email}`),
      limit: 5,
      windowSec: 15 * 60,
    });
    rateLimit({
      name: "auth.login.account",
      key: fingerprint(body.email),
      limit: 30,
      windowSec: 60 * 60,
    });

    const { customer, session } = await login(body, {
      userAgent: request.headers.get("user-agent"),
    });

    const response = jsonResponse({ user: toUserDto(customer) });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  },
);
