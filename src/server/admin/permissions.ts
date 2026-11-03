/**
 * Everything a role can allow. This list is the only place permission names
 * exist: roles in the database store names from here, and every admin endpoint
 * names the one it needs. Add a permission here before using it anywhere.
 */
export const PERMISSIONS = {
  "dashboard.view": "See the dashboard numbers",
  "orders.view": "See orders and their history",
  "orders.manage":
    "Move orders along (delivery, completed) and cancel unpaid orders",
  "orders.refund": "Record refunds, including cancelling a paid order",
  "payments.verify":
    "Check payment proofs, confirm bank, Easypaisa, JazzCash and cash payments, and see the screenshots",
  "products.view": "See products, prices and photos",
  "products.manage": "Create and edit products, variants, prices and photos",
  "products.delete": "Delete (hide) and restore products",
  "catalog.manage": "Manage categories, collections and the home page sections",
  "stock.view": "See stock levels and movements",
  "stock.adjust": "Change stock levels",
  "customers.view": "See customers and their orders",
  "customers.manage": "Block and unblock customers",
  "settings.view": "See the shop settings",
  "settings.manage": "Change shipping fees, VAT, hold time and shop details",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const PERMISSION_LIST = Object.keys(PERMISSIONS) as Permission[];

/**
 * Things only a super admin can do. They are not permissions, so a role can
 * never give them away: managing staff, managing roles, reading the audit log.
 */
export type SuperAdminOnly = "super_admin";

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && Object.hasOwn(PERMISSIONS, value);
}

/** Keeps only valid, distinct permission names, in catalogue order. */
export function normalizePermissions(values: readonly string[]): Permission[] {
  const wanted = new Set(values);
  return PERMISSION_LIST.filter((permission) => wanted.has(permission));
}

export interface PermissionHolder {
  isSuperAdmin: boolean;
  permissions: ReadonlySet<Permission>;
}

/** A super admin has every permission; anyone else has what their roles add up to. */
export function can(
  holder: PermissionHolder,
  needed: Permission | SuperAdminOnly,
): boolean {
  if (holder.isSuperAdmin) return true;
  if (needed === "super_admin") return false;
  return holder.permissions.has(needed);
}
