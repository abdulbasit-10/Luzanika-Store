import { clearStaffCookie, readStaffToken } from "@/server/auth/staff-cookie";
import { noContent } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { logout } from "@/server/services/staff-auth-service";

/** POST /api/v1/admin/auth/logout: ends this browser's session. Always succeeds, signed in or not. */
export const POST = route(
  { name: "admin.auth.logout" },
  async ({ request }) => {
    await logout(readStaffToken(request));

    const response = noContent();
    clearStaffCookie(response);
    return response;
  },
);
