import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "@/server/auth/session-cookie";
import { toUserDto } from "@/server/dto/user";
import { json } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { authenticate } from "@/server/services/auth-service";

/**
 * GET /api/v1/auth/me: who is signed in. Signed out is a normal answer
 * ({ user: null }, status 200), not an error, so the site can ask on every
 * page load without noise in the browser console.
 */
export const GET = route({ name: "auth.me" }, async ({ request }) => {
  const token = readSessionToken(request);
  const auth = await authenticate(token);

  if (!auth || !token) {
    const response = json({ user: null });
    // A leftover cookie that no longer works is cleaned up.
    if (token) clearSessionCookie(response);
    return response;
  }

  const response = json({ user: toUserDto(auth.customer) });
  if (auth.renewedUntil) setSessionCookie(response, token, auth.renewedUntil);
  return response;
});
