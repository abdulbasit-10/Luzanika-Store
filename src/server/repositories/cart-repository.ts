import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export type Market = "PK" | "DE";

export interface CartLineRow {
  variant_id: string;
  quantity: number;
  selected: boolean;
  product_id: string;
  slug: string;
  name: string;
  notes: string[];
  color_name: string | null;
  size_label: string | null;
  /** How many colours the product comes in; the colour is only worth showing when there is a choice. */
  color_count: number;
  purchasable: boolean;
  currency: "PKR" | "EUR" | null;
  amount: string | null;
  compare_at_amount: string | null;
  available: number;
  image_src: string | null;
  image_alt: string | null;
  image_position: string | null;
}

export interface VariantStock {
  purchasable: boolean;
  available: number;
}

/** Cart rows for one customer, joined with the live product, price and stock. Never trusts a stored price. */
export const cartRepository = {
  /** Makes this customer's other cart requests wait their turn (two taps at once cannot both pass the limits). */
  async lockCustomer(customerId: string, tx: Tx): Promise<void> {
    await selectRows(
      "SELECT id FROM customers WHERE id = :customerId FOR UPDATE",
      { customerId },
      tx,
    );
  },

  listLines(
    customerId: string,
    market: Market,
    tx?: Tx,
  ): Promise<CartLineRow[]> {
    return selectRows<CartLineRow>(
      `SELECT ci.variant_id, ci.quantity, ci.selected,
         p.id AS product_id, p.slug, p.name, p.notes,
         v.color_name, v.size_label,
         (SELECT count(DISTINCT color_name)::int FROM product_variants
            WHERE product_id = p.id AND active) AS color_count,
         (v.active AND p.status = 'active' AND p.deleted_at IS NULL
            AND pr.amount IS NOT NULL) AS purchasable,
         pr.currency, pr.amount, pr.compare_at_amount,
         COALESCE(i.on_hand - i.reserved, 0)::int AS available,
         img.src AS image_src, img.alt AS image_alt, img.position AS image_position
       FROM cart_items ci
       JOIN product_variants v ON v.id = ci.variant_id
       JOIN products p ON p.id = v.product_id
       LEFT JOIN product_prices pr ON pr.product_id = p.id AND pr.market = :market
       LEFT JOIN inventory i ON i.variant_id = v.id AND i.market = :market
       LEFT JOIN LATERAL (
         SELECT src, alt, position FROM product_images
         WHERE product_id = p.id ORDER BY sort LIMIT 1
       ) img ON true
       WHERE ci.customer_id = :customerId
       ORDER BY ci.created_at, ci.variant_id`,
      { customerId, market },
      tx,
    );
  },

  async findVariantStock(
    variantId: string,
    market: Market,
    tx: Tx,
  ): Promise<VariantStock | undefined> {
    const rows = await selectRows<VariantStock>(
      `SELECT (v.active AND p.status = 'active' AND p.deleted_at IS NULL
                 AND pr.amount IS NOT NULL) AS purchasable,
              COALESCE(i.on_hand - i.reserved, 0)::int AS available
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       LEFT JOIN product_prices pr ON pr.product_id = p.id AND pr.market = :market
       LEFT JOIN inventory i ON i.variant_id = v.id AND i.market = :market
       WHERE v.id = :variantId`,
      { variantId, market },
      tx,
    );
    return rows[0];
  },

  async getQuantity(
    customerId: string,
    variantId: string,
    tx: Tx,
  ): Promise<number | undefined> {
    const rows = await selectRows<{ quantity: number }>(
      "SELECT quantity FROM cart_items WHERE customer_id = :customerId AND variant_id = :variantId",
      { customerId, variantId },
      tx,
    );
    return rows[0]?.quantity;
  },

  async countLines(customerId: string, tx: Tx): Promise<number> {
    const rows = await selectRows<{ n: number }>(
      "SELECT count(*)::int AS n FROM cart_items WHERE customer_id = :customerId",
      { customerId },
      tx,
    );
    return rows[0].n;
  },

  /** Adds the line or sets its quantity; an added line is always ticked. */
  async upsert(
    customerId: string,
    variantId: string,
    quantity: number,
    tx: Tx,
  ): Promise<void> {
    await execute(
      `INSERT INTO cart_items (customer_id, variant_id, quantity)
       VALUES (:customerId, :variantId, :quantity)
       ON CONFLICT (customer_id, variant_id)
       DO UPDATE SET quantity = EXCLUDED.quantity, selected = true`,
      { customerId, variantId, quantity },
      tx,
    );
  },

  /** Changes only the fields given. Returns false when the customer has no such line. */
  async update(
    customerId: string,
    variantId: string,
    changes: { quantity?: number; selected?: boolean },
    tx: Tx,
  ): Promise<boolean> {
    const affected = await execute(
      `UPDATE cart_items
       SET quantity = COALESCE(:quantity, quantity),
           selected = COALESCE(:selected, selected)
       WHERE customer_id = :customerId AND variant_id = :variantId`,
      {
        customerId,
        variantId,
        quantity: changes.quantity ?? null,
        selected: changes.selected ?? null,
      },
      tx,
    );
    return affected > 0;
  },

  async remove(
    customerId: string,
    variantIds: string[],
    tx: Tx,
  ): Promise<void> {
    if (variantIds.length === 0) return;
    await execute(
      "DELETE FROM cart_items WHERE customer_id = :customerId AND variant_id IN (:variantIds)",
      { customerId, variantIds },
      tx,
    );
  },

  async deleteAllForCustomer(customerId: string, tx: Tx): Promise<void> {
    await execute(
      "DELETE FROM cart_items WHERE customer_id = :customerId",
      { customerId },
      tx,
    );
  },
};
