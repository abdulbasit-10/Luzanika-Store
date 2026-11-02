import "server-only";

import type { NextResponse } from "next/server";

import type { Permission, SuperAdminOnly } from "@/server/admin/permissions";
import { recordAudit, type AuditEntry } from "@/server/audit/audit";
import type { Tx } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import { route, type ApiContext, type RouteOptions } from "@/server/http/route";
import {
  authenticate,
  principalCan,
  type StaffPrincipal,
} from "@/server/services/staff-auth-service";
import type { AdminContext } from "@/server/services/staff-admin-service";

import {
  readStaffToken,
  setStaffCookie,
  staffCookieName,
} from "./staff-cookie";

type Params = Record<string, string | string[]>;

export interface StaffRouteOptions extends RouteOptions {
  /**
   * What the staff member must be allowed to do. "super_admin" is for staff,
   * roles and the audit log, which no role can give away. A list means "any one
   * of these" (for example someone who may edit products or the catalogue can
   * read the category list). Leave it out only for endpoints every signed-in
   * staff member may use (their own profile).
   */
  permission?: Permission | SuperAdminOnly | Permission[];
  /**
   * "verified" (default): a finished sign-in, password and authenticator code.
   * "pending": only a session that has the password right but no code yet
   *   (the 2FA set-up and verify endpoints).
   * "any": either (who am I, log out).
   */
  stage?: "verified" | "pending" | "any";
}

export interface StaffContext<P extends Params = Params> extends ApiContext<P> {
  principal: StaffPrincipal;
  /** Who is acting and which request it is, for the services that write the audit log. */
  admin: AdminContext;
  /** Writes an audit row inside the given transaction, as this staff member. */
  audit: (tx: Tx | undefined, entry: AuditEntry) => Promise<void>;
}

/**
 * Like route(), for admin endpoints. Before the handler runs it answers 401
 * without a valid staff session, 403 `two_factor_required` while the
 * authenticator code is still missing, and 403 `forbidden` when the staff
 * member's roles do not allow the endpoint. It also keeps the cookie's expiry
 * in step when the session is extended.
 *
 *   export const GET = staffRoute({ name: "admin.orders.list", permission: "orders.view" }, ...)
 */
export function staffRoute<P extends Params = Params>(
  options: StaffRouteOptions,
  handler: (context: StaffContext<P>) => NextResponse | Promise<NextResponse>,
) {
  const stage = options.stage ?? "verified";

  return route<P>(options, async (context) => {
    const token = readStaffToken(context.request);
    const principal = await authenticate(token);
    if (!principal || !token) throw new ApiError("unauthenticated");

    if (stage === "verified" && !principal.mfaVerified) {
      throw new ApiError("two_factor_required");
    }
    if (stage === "pending" && principal.mfaVerified) {
      throw new ApiError("conflict", { message: "You are already signed in." });
    }
    if (
      options.permission &&
      stage !== "pending" &&
      !(Array.isArray(options.permission)
        ? options.permission.some((needed) => principalCan(principal, needed))
        : principalCan(principal, options.permission))
    ) {
      throw new ApiError("forbidden");
    }

    const { staff } = principal;
    const actor = {
      id: staff.id,
      email: staff.email,
      name: `${staff.firstName} ${staff.lastName}`.trim(),
    };

    const response = await handler({
      ...context,
      principal,
      admin: { actor, requestId: context.requestId },
      audit: (tx, entry) => recordAudit(tx, actor, entry, context.requestId),
    });

    // A handler that ended the session has already cleared the cookie; don't bring it back.
    const cookieAlreadySet =
      response.cookies.get(staffCookieName()) !== undefined;
    if (principal.renewedUntil && !cookieAlreadySet) {
      setStaffCookie(response, token, principal.renewedUntil);
    }
    return response;
  });
}
