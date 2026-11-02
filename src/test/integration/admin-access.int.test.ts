import { describe, expect, it } from "vitest";

import { signedInStaff } from "./admin-helpers";
import { call } from "./helpers";

/**
 * Every admin route in the code base, found by its file name, so a new
 * endpoint cannot be added without being covered here.
 */
const routeModules = import.meta.glob("/src/app/api/v1/admin/**/route.ts");

/** Endpoints that are allowed without a finished sign-in, or for any signed-in staff member. */
const NOT_PERMISSION_GATED = [
  "/auth/login",
  "/auth/logout",
  "/auth/me",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/accept-invite",
  "/auth/change-password",
  "/auth/2fa/setup",
  "/auth/2fa/enable",
  "/auth/2fa/verify",
];
/** Open to any signed-in staff member (the list of permissions a role can be given). */
const ANY_SIGNED_IN_STAFF = ["/permissions"];

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const UUID = "00000000-0000-4000-8000-000000000000";

interface Endpoint {
  path: string;
  method: (typeof METHODS)[number];
  handler: Parameters<typeof call>[0];
  params: Record<string, string>;
}

async function endpoints(): Promise<Endpoint[]> {
  const found: Endpoint[] = [];
  for (const [file, load] of Object.entries(routeModules)) {
    const route = file
      .replace("/src/app/api/v1/admin", "")
      .replace("/route.ts", "");
    if (NOT_PERMISSION_GATED.includes(route)) continue;
    if (ANY_SIGNED_IN_STAFF.includes(route)) continue;

    const loaded = (await load()) as Record<string, unknown>;
    const params: Record<string, string> = {};
    for (const name of route.matchAll(/\[(\w+)\]/g)) {
      params[name[1]] = name[1] === "number" ? "LZ-000000" : UUID;
    }
    for (const method of METHODS) {
      if (typeof loaded[method] === "function") {
        found.push({
          path: `${method} ${route}`,
          method,
          handler: loaded[method] as Endpoint["handler"],
          params,
        });
      }
    }
  }
  return found;
}

describe("every admin endpoint is closed to people who may not use it", () => {
  it("finds the admin endpoints", async () => {
    const all = await endpoints();
    // A guard against the file search silently finding nothing.
    expect(all.length).toBeGreaterThanOrEqual(56);
  });

  it("answers 401 without a staff session", async () => {
    const failures: string[] = [];
    for (const endpoint of await endpoints()) {
      const result = await call(endpoint.handler, {
        method: endpoint.method,
        params: endpoint.params,
        body: endpoint.method === "GET" ? undefined : {},
      });
      if (result.status !== 401) {
        failures.push(`${endpoint.path} -> ${result.status}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("answers 403 to a signed-in staff member whose roles allow nothing", async () => {
    const nobody = await signedInStaff({ permissions: [] });
    const failures: string[] = [];
    for (const endpoint of await endpoints()) {
      const result = await call(endpoint.handler, {
        method: endpoint.method,
        params: endpoint.params,
        staffCookie: nobody.cookie,
        body: endpoint.method === "GET" ? undefined : {},
      });
      if (result.status !== 403) {
        failures.push(`${endpoint.path} -> ${result.status}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("keeps staff, roles and the audit log for the super admin, even from someone with every permission", async () => {
    const everything = await signedInStaff({
      permissions: [
        "dashboard.view",
        "orders.view",
        "orders.manage",
        "orders.refund",
        "products.view",
        "products.manage",
        "products.delete",
        "catalog.manage",
        "stock.view",
        "stock.adjust",
        "customers.view",
        "customers.manage",
        "settings.view",
        "settings.manage",
      ],
    });
    const failures: string[] = [];
    for (const endpoint of await endpoints()) {
      if (!/^(\w+) \/(staff|roles|audit)(\/|$)/.test(endpoint.path)) continue;
      const result = await call(endpoint.handler, {
        method: endpoint.method,
        params: endpoint.params,
        staffCookie: everything.cookie,
        body: endpoint.method === "GET" ? undefined : {},
      });
      if (result.status !== 403) {
        failures.push(`${endpoint.path} -> ${result.status}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
