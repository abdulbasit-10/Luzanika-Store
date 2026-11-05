/** Plain words for what the audit log records. An action not listed here is shown as written. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "orders.status_change": "Order status changed",
  "orders.delivery_update": "Delivery details changed",
  "orders.delete": "Order deleted",
  "orders.payment_confirm": "Payment confirmed",
  "orders.payment_reject": "Payment rejected",
  "orders.refund": "Refund recorded",
  "products.create": "Product created",
  "products.update": "Product changed",
  "products.delete": "Product deleted",
  "products.restore": "Product restored",
  "products.prices": "Prices changed",
  "products.sections": "Product details text changed",
  "products.image_add": "Photo added",
  "products.image_update": "Photo changed",
  "products.image_remove": "Photo removed",
  "products.images_reorder": "Photos reordered",
  "variants.create": "Size or colour added",
  "variants.update": "Size or colour changed",
  "stock.adjust": "Stock changed",
  "stock.threshold": "Low-stock alert changed",
  "contact.reply": "Contact message answered",
  "discounts.create": "Discount created",
  "discounts.update": "Discount changed",
  "discounts.delete": "Discount deleted",
  "reviews.publish": "Review published",
  "reviews.hide": "Review hidden",
  "reviews.delete": "Review deleted",
  "reviews.restore": "Review shown again",
  "customers.block": "Customer blocked",
  "customers.unblock": "Customer unblocked",
  "settings.update": "Settings changed",
  "categories.create": "Category created",
  "categories.update": "Category changed",
  "categories.delete": "Category deleted",
  "categories.collections": "Category filters changed",
  "subcategories.create": "Type created",
  "subcategories.update": "Type changed",
  "subcategories.delete": "Type deleted",
  "collections.create": "Collection created",
  "collections.update": "Collection changed",
  "collections.delete": "Collection deleted",
  "home.update": "Home page section changed",
  "home.offer": "Special offer timing changed",
  "roles.create": "Role created",
  "roles.update": "Role changed",
  "roles.delete": "Role deleted",
  "staff.invite": "Staff invited",
  "staff.invite_resent": "Invite sent again",
  "staff.invite_accepted": "Invite accepted",
  "staff.update": "Staff changed",
  "staff.password_changed": "Password changed",
  "staff.password_reset": "Password reset",
  "staff.two_factor_enabled": "Authenticator set up",
  "staff.two_factor_reset": "Authenticator reset",
};

export const auditActionLabel = (action: string): string =>
  AUDIT_ACTION_LABELS[action] ?? action;

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  order: "Orders",
  product: "Products",
  variant: "Sizes and colours",
  stock: "Stock",
  customer: "Customers",
  review: "Reviews",
  settings: "Settings",
  category: "Categories",
  subcategory: "Types",
  collection: "Collections",
  home_section: "Home page",
  role: "Roles",
  staff: "Staff",
};

export const auditEntityLabel = (entityType: string): string =>
  AUDIT_ENTITY_LABELS[entityType] ?? entityType;

/** Actions grouped under their entity word, for the filter list ("orders.refund" → "orders"). */
export const AUDIT_ACTIONS: string[] = Object.keys(AUDIT_ACTION_LABELS);

/** A long id shortened for a table cell: "bb1daa56…". Short ids and order numbers stay whole. */
export function shortId(id: string | null): string {
  if (!id) return "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id) ? `${id.slice(0, 8)}…` : id;
}
