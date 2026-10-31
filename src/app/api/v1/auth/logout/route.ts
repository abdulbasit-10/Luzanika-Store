import {
  clearSessionCookie,
  readSessionToken,
} from "@/server/auth/session-cookie";
import { noContent } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { logout } from "@/server/services/auth-service";

/** POST /api/v1/auth/logout: ends this browser's session. Always succeeds, signed in or not. */
export const POST = route({ name: "auth.logout" }, async ({ request }) => {
  await logout(readSessionToken(request));

  const response = noContent();
  clearSessionCookie(response);
  return response;
});
