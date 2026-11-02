import { staffRoute } from "@/server/auth/staff-route";
import { toStaffProfile } from "@/server/dto/staff";
import { json } from "@/server/http/responses";
import { PERMISSION_LIST } from "@/server/admin/permissions";

/**
 * GET /api/v1/admin/auth/me: who is signed in and what they may do. Answers
 * 401 when nobody is. `stage` is "pending" while the authenticator code is
 * still missing; "next" then says whether to set one up or type a code.
 */
export const GET = staffRoute(
  { name: "admin.auth.me", stage: "any" },
  ({ principal }) => {
    const verified = principal.mfaVerified;
    return json({
      staff: toStaffProfile(principal),
      stage: verified ? "verified" : "pending",
      ...(verified
        ? {
            permissions: principal.isSuperAdmin
              ? PERMISSION_LIST
              : PERMISSION_LIST.filter((name) =>
                  principal.permissions.has(name),
                ),
          }
        : {
            next: principal.staff.totpEnabledAt
              ? "two_factor_verify"
              : "two_factor_setup",
          }),
    });
  },
);
