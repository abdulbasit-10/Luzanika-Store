import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export interface WishlistEntry {
  product_id: string;
  created_at: Date;
}

export const wishlistRepository = {
  async lockCustomer(customerId: string, tx: Tx): Promise<void> {
    await selectRows(
      "SELECT id FROM customers WHERE id = :customerId FOR UPDATE",
      { customerId },
      tx,
    );
  },

  /** Newest first. */
  list(customerId: string, tx?: Tx): Promise<WishlistEntry[]> {
    return selectRows<WishlistEntry>(
      `SELECT w.product_id, w.created_at FROM wishlist_items w
       WHERE w.customer_id = :customerId
       ORDER BY w.created_at DESC, w.product_id`,
      { customerId },
      tx,
    );
  },

  async count(customerId: string, tx: Tx): Promise<number> {
    const rows = await selectRows<{ n: number }>(
      "SELECT count(*)::int AS n FROM wishlist_items WHERE customer_id = :customerId",
      { customerId },
      tx,
    );
    return rows[0].n;
  },

  async has(customerId: string, productId: string, tx: Tx): Promise<boolean> {
    const rows = await selectRows(
      "SELECT 1 FROM wishlist_items WHERE customer_id = :customerId AND product_id = :productId",
      { customerId, productId },
      tx,
    );
    return rows.length > 0;
  },

  /** Saving a product that is already saved changes nothing. */
  async add(customerId: string, productId: string, tx: Tx): Promise<void> {
    await execute(
      `INSERT INTO wishlist_items (customer_id, product_id)
       VALUES (:customerId, :productId)
       ON CONFLICT (customer_id, product_id) DO NOTHING`,
      { customerId, productId },
      tx,
    );
  },

  async remove(customerId: string, productId: string, tx: Tx): Promise<void> {
    await execute(
      "DELETE FROM wishlist_items WHERE customer_id = :customerId AND product_id = :productId",
      { customerId, productId },
      tx,
    );
  },

  async deleteAllForCustomer(customerId: string, tx: Tx): Promise<void> {
    await execute(
      "DELETE FROM wishlist_items WHERE customer_id = :customerId",
      { customerId },
      tx,
    );
  },
};
