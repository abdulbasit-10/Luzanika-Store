import { describe, expect, it } from "vitest";

import {
  ADMIN_SECTION_SLUGS,
  isActive,
  sectionLabel,
  visibleNavGroups,
} from "./admin-nav";

const labels = (access: Parameters<typeof visibleNavGroups>[0]) =>
  visibleNavGroups(access).map((group) => group.map((item) => item.label));

describe("visibleNavGroups", () => {
  it("shows a super admin everything", () => {
    expect(labels({ isSuperAdmin: true, permissions: [] })).toEqual([
      ["Dashboard", "Orders"],
      [
        "Products",
        "Catalog",
        "Discounts",
        "Inventory",
        "Customers",
        "Reviews",
        "Contact Us",
      ],
      ["Staff & roles", "Audit log"],
    ]);
  });

  it("shows staff only what their permissions allow and drops empty groups", () => {
    expect(
      labels({
        isSuperAdmin: false,
        permissions: ["orders.view", "customers.view"],
      }),
    ).toEqual([["Orders"], ["Customers"]]);
  });

  it("never gives staff the super admin screens, whatever they were granted", () => {
    const all = labels({
      isSuperAdmin: false,
      permissions: ["staff.manage", "audit.view", "dashboard.view"],
    }).flat();
    expect(all).toEqual(["Dashboard"]);
  });

  it("shows nothing to staff without permissions", () => {
    expect(labels({ isSuperAdmin: false, permissions: [] })).toEqual([]);
  });
});

describe("isActive", () => {
  it("matches the dashboard only on its own address", () => {
    expect(isActive("/admin", "/admin")).toBe(true);
    expect(isActive("/admin", "/admin/orders")).toBe(false);
  });

  it("matches a section and its sub-pages, not a lookalike", () => {
    expect(isActive("/admin/orders", "/admin/orders")).toBe(true);
    expect(isActive("/admin/orders", "/admin/orders/42")).toBe(true);
    expect(isActive("/admin/orders", "/admin/orders-archive")).toBe(false);
  });
});

describe("ADMIN_SECTION_SLUGS", () => {
  it("lists every sidebar address except the dashboard", () => {
    expect(ADMIN_SECTION_SLUGS).toEqual([
      "orders",
      "products",
      "catalog",
      "discounts",
      "stock",
      "customers",
      "reviews",
      "contact",
      "staff",
      "audit-log",
      "settings",
    ]);
  });
});

describe("sectionLabel", () => {
  it("gives the menu label of an address", () => {
    expect(sectionLabel("stock")).toBe("Inventory");
    expect(sectionLabel("audit-log")).toBe("Audit log");
    expect(sectionLabel("settings")).toBe("Settings");
  });

  it("is undefined for an address that is not in the menu", () => {
    expect(sectionLabel("nope")).toBeUndefined();
  });
});
