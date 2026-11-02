import { describe, expect, it } from "vitest";

import {
  can,
  isPermission,
  normalizePermissions,
  PERMISSION_LIST,
  type Permission,
} from "./permissions";

const holder = (permissions: Permission[], isSuperAdmin = false) => ({
  isSuperAdmin,
  permissions: new Set(permissions),
});

describe("permissions", () => {
  it("knows exactly the permissions in the catalogue", () => {
    expect(isPermission("orders.view")).toBe(true);
    expect(isPermission("orders.fly")).toBe(false);
    expect(isPermission(42)).toBe(false);
    expect(isPermission("toString")).toBe(false);
    expect(isPermission("__proto__")).toBe(false);
  });

  it("keeps only valid, distinct names, in catalogue order", () => {
    expect(
      normalizePermissions([
        "stock.adjust",
        "orders.view",
        "nope",
        "orders.view",
      ]),
    ).toEqual(["orders.view", "stock.adjust"]);
  });

  it("gives a staff member what their roles add up to, and nothing else", () => {
    const staff = holder(["orders.view", "stock.view"]);

    expect(can(staff, "orders.view")).toBe(true);
    expect(can(staff, "stock.view")).toBe(true);
    expect(can(staff, "orders.refund")).toBe(false);
  });

  it("gives a super admin everything", () => {
    const admin = holder([], true);

    for (const permission of PERMISSION_LIST) {
      expect(can(admin, permission)).toBe(true);
    }
    expect(can(admin, "super_admin")).toBe(true);
  });

  it("never lets a role give away the super admin only actions", () => {
    const everything = holder([...PERMISSION_LIST]);

    expect(can(everything, "super_admin")).toBe(false);
  });
});
