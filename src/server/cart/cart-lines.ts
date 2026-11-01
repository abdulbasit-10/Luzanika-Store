import type { CartLineRow } from "@/server/repositories/cart-repository";

/**
 * - ok: can be bought as asked
 * - adjusted: more was asked for than is in stock, so the quantity was lowered to what is available
 * - out_of_stock: nothing available in this market right now
 * - unavailable: no longer sold (hidden product, switched-off variant, or no price in this market)
 */
export type CartLineStatus = "ok" | "adjusted" | "out_of_stock" | "unavailable";

export interface CartLineDto {
  /** The variant id; also what the cart endpoints use to address the line. */
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  image?: { src: string; alt: string; position?: string };
  notes?: string[];
  /** Only set when the product comes in more than one colour. */
  color?: string;
  size?: string;
  /** Price in the requested market, minor units. */
  unitPrice: {
    amount: number;
    currency: "PKR" | "EUR";
    compareAtAmount?: number;
  } | null;
  /** What will be bought: the requested amount, lowered to the available stock. 0 when it cannot be bought. */
  quantity: number;
  /** What the customer asked for. Bigger than `quantity` when `status` is "adjusted". */
  requestedQuantity: number;
  /** Units that can be sold right now in this market (the most `quantity` can be). */
  available: number;
  /** Ticked and buyable. A line that cannot be bought is never selected. */
  selected: boolean;
  status: CartLineStatus;
}

export function toCartLine(row: CartLineRow): CartLineDto {
  const available = row.purchasable ? Math.max(0, row.available) : 0;
  const status: CartLineStatus = !row.purchasable
    ? "unavailable"
    : available === 0
      ? "out_of_stock"
      : row.quantity > available
        ? "adjusted"
        : "ok";
  const buyable = status === "ok" || status === "adjusted";

  return {
    variantId: row.variant_id,
    productId: row.product_id,
    slug: row.slug,
    name: row.name,
    ...(row.image_src
      ? {
          image: {
            src: row.image_src,
            alt: row.image_alt ?? "",
            ...(row.image_position ? { position: row.image_position } : {}),
          },
        }
      : {}),
    ...(row.notes.length ? { notes: row.notes } : {}),
    ...(row.color_name && row.color_count > 1 ? { color: row.color_name } : {}),
    ...(row.size_label ? { size: row.size_label } : {}),
    unitPrice:
      row.amount !== null && row.currency
        ? {
            amount: Number(row.amount),
            currency: row.currency,
            ...(row.compare_at_amount !== null
              ? { compareAtAmount: Number(row.compare_at_amount) }
              : {}),
          }
        : null,
    quantity: buyable ? Math.min(row.quantity, available) : 0,
    requestedQuantity: row.quantity,
    available,
    selected: row.selected && buyable,
    status,
  };
}
