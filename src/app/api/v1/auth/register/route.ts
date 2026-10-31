import { setSessionCookie } from "@/server/auth/session-cookie";
import { toUserDto } from "@/server/dto/user";
import { created } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { register } from "@/server/services/auth-service";
import { registerSchema } from "@/server/validation/auth-schemas";

/** POST /api/v1/auth/register: creates the account and signs the customer in. */
export const POST = route(
  { name: "auth.register", rateLimit: { limit: 5, windowSec: 60 * 60 } },
  async ({ json, request }) => {
    const body = await json(registerSchema);
    const { customer, session } = await register(body, {
      userAgent: request.headers.get("user-agent"),
    });

    const response = created({ user: toUserDto(customer) }, "/api/v1/auth/me");
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  },
);
