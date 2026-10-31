import "server-only";

import type { NextResponse } from "next/server";

import { ApiError } from "@/server/http/api-error";
import { route, type ApiContext, type RouteOptions } from "@/server/http/route";
import type { CustomerRecord } from "@/server/repositories/customer-repository";
import { authenticate } from "@/server/services/auth-service";

import { readSessionToken, setSessionCookie } from "./session-cookie";

type Params = Record<string, string | string[]>;

export interface CustomerContext<
  P extends Params = Params,
> extends ApiContext<P> {
  customer: CustomerRecord;
  sessionId: string;
}

/**
 * Like route(), for endpoints that need a signed-in customer. Answers 401
 * before the handler runs when there is no valid session, and keeps the
 * cookie's expiry in step when the session is extended.
 *
 *   export const GET = customerRoute({ name: "wishlist.list" }, ({ customer }) => ...);
 */
export function customerRoute<P extends Params = Params>(
  options: RouteOptions,
  handler: (
    context: CustomerContext<P>,
  ) => NextResponse | Promise<NextResponse>,
) {
  return route<P>(options, async (context) => {
    const token = readSessionToken(context.request);
    const auth = await authenticate(token);
    if (!auth || !token) throw new ApiError("unauthenticated");

    const response = await handler({
      ...context,
      customer: auth.customer,
      sessionId: auth.sessionId,
    });
    if (auth.renewedUntil) setSessionCookie(response, token, auth.renewedUntil);
    return response;
  });
}
