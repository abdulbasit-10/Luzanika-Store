import {
  ClipboardList,
  LayoutDashboard,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** The permission that shows this item. Without one, every signed-in person sees it. */
  permission?: string;
  /** Only the super admin sees it, whatever roles they were given. */
  superAdminOnly?: boolean;
}

/** Groups are split by a thin line in the sidebar. */
export const ADMIN_NAV_GROUPS: AdminNavItem[][] = [
  [
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      permission: "dashboard.view",
    },
    {
      href: "/admin/orders",
      label: "Orders",
      icon: ClipboardList,
      permission: "orders.view",
    },
  ],
  [
    {
      href: "/admin/products",
      label: "Products",
      icon: Package,
      permission: "products.view",
    },
    {
      href: "/admin/stock",
      label: "Inventory",
      icon: Warehouse,
      permission: "stock.view",
    },
    {
      href: "/admin/customers",
      label: "Customers",
      icon: Users,
      permission: "customers.view",
    },
  ],
  [
    {
      href: "/admin/staff",
      label: "Staff & roles",
      icon: ShieldCheck,
      superAdminOnly: true,
    },
    {
      href: "/admin/audit-log",
      label: "Audit log",
      icon: ScrollText,
      superAdminOnly: true,
    },
  ],
];

/** Pinned to the bottom of the sidebar, above "Log Out". */
export const ADMIN_SETTINGS_ITEM: AdminNavItem = {
  href: "/admin/settings",
  label: "Settings",
  icon: Settings,
  permission: "settings.view",
};

export interface AdminAccess {
  isSuperAdmin: boolean;
  permissions: readonly string[];
}

export function canSee(item: AdminNavItem, access: AdminAccess): boolean {
  if (item.superAdminOnly) return access.isSuperAdmin;
  if (!item.permission) return true;
  return access.isSuperAdmin || access.permissions.includes(item.permission);
}

/** The groups a person may use; groups left empty disappear with their line. */
export function visibleNavGroups(access: AdminAccess): AdminNavItem[][] {
  return ADMIN_NAV_GROUPS.map((group) =>
    group.filter((item) => canSee(item, access)),
  ).filter((group) => group.length > 0);
}

/** Every address the sidebar can open. */
export const ADMIN_SECTION_SLUGS: readonly string[] = [
  ...ADMIN_NAV_GROUPS.flat(),
  ADMIN_SETTINGS_ITEM,
]
  .map((item) => item.href.replace("/admin/", ""))
  .filter((slug) => slug !== "/admin");

/** The item that owns a path: "/admin" only matches itself, the others also match their sub-pages. */
export function isActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The menu label of an address like "stock" (→ "Inventory"), for the heading of a screen not built yet. */
export function sectionLabel(slug: string): string | undefined {
  return [...ADMIN_NAV_GROUPS.flat(), ADMIN_SETTINGS_ITEM].find(
    (item) => item.href === `/admin/${slug}`,
  )?.label;
}
