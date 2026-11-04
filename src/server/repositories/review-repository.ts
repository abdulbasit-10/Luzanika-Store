import "server-only";

import { execute, selectRows } from "@/server/db/query";
import type { Tx } from "@/server/db/transaction";

export type ReviewStatus = "published" | "hidden";

export interface ReviewRow {
  id: string;
  product_id: string;
  customer_id: string | null;
  order_id: string | null;
  author_name: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  hidden_reason: string | null;
  hidden_at: Date | null;
  hidden_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AdminReviewRow extends ReviewRow {
  product_name: string;
  product_slug: string;
  customer_email: string | null;
  hidden_by_name: string | null;
}

export interface AdminReviewFilter {
  status?: ReviewStatus;
  rating?: number;
  productId?: string;
  /** Matches the review text, the title, the author or the product name. */
  search?: string;
}

const COLUMNS = `r.id, r.product_id, r.customer_id, r.order_id, r.author_name, r.rating, r.title, r.body,
  r.status, r.hidden_reason, r.hidden_at, r.hidden_by, r.created_at, r.updated_at`;

function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

export const reviewRepository = {
  /** The published reviews of a product, newest first. */
  async listPublished(
    productId: string,
    limit: number,
    offset: number,
  ): Promise<{ rows: ReviewRow[]; total: number }> {
    const [rows, count] = await Promise.all([
      selectRows<ReviewRow>(
        `SELECT ${COLUMNS} FROM product_reviews r
         WHERE r.product_id = :productId AND r.status = 'published'
         ORDER BY r.created_at DESC, r.id LIMIT :limit OFFSET :offset`,
        { productId, limit, offset },
      ),
      selectRows<{ n: number }>(
        `SELECT count(*)::int AS n FROM product_reviews
         WHERE product_id = :productId AND status = 'published'`,
        { productId },
      ),
    ]);
    return { rows, total: count[0].n };
  },

  /** How many published reviews gave each star, and the average. */
  async summary(productId: string): Promise<{
    average: number | null;
    count: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  }> {
    const rows = await selectRows<{ rating: number; n: number }>(
      `SELECT rating, count(*)::int AS n FROM product_reviews
       WHERE product_id = :productId AND status = 'published' GROUP BY rating`,
      { productId },
    );
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let sum = 0;
    for (const row of rows) {
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row.n;
      total += row.n;
      sum += row.rating * row.n;
    }
    return {
      average: total === 0 ? null : Math.round((sum / total) * 10) / 10,
      count: total,
      distribution,
    };
  },

  async findByCustomerAndProduct(
    customerId: string,
    productId: string,
    tx?: Tx,
  ): Promise<ReviewRow | undefined> {
    const rows = await selectRows<ReviewRow>(
      `SELECT ${COLUMNS} FROM product_reviews r
       WHERE r.customer_id = :customerId AND r.product_id = :productId`,
      { customerId, productId },
      tx,
    );
    return rows[0];
  },

  async findById(id: string, tx?: Tx): Promise<ReviewRow | undefined> {
    const rows = await selectRows<ReviewRow>(
      `SELECT ${COLUMNS} FROM product_reviews r WHERE r.id = :id`,
      { id },
      tx,
    );
    return rows[0];
  },

  /** Locks the review so staff hiding it and the customer editing it cannot overlap. */
  async lockById(id: string, tx: Tx): Promise<ReviewRow | undefined> {
    const rows = await selectRows<ReviewRow>(
      `SELECT ${COLUMNS} FROM product_reviews r WHERE r.id = :id FOR UPDATE OF r`,
      { id },
      tx,
    );
    return rows[0];
  },

  /** The newest completed order of this customer that contains the product: the proof of purchase. */
  async findQualifyingOrder(
    customerId: string,
    productId: string,
    tx?: Tx,
  ): Promise<string | undefined> {
    const rows = await selectRows<{ id: string }>(
      `SELECT o.id FROM orders o
       WHERE o.customer_id = :customerId AND o.status = 'completed'
         AND EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id AND i.product_id = :productId)
       ORDER BY o.completed_at DESC NULLS LAST, o.placed_at DESC LIMIT 1`,
      { customerId, productId },
      tx,
    );
    return rows[0]?.id;
  },

  async insert(
    input: {
      productId: string;
      customerId: string;
      orderId: string;
      authorName: string;
      rating: number;
      title: string | null;
      body: string;
    },
    tx: Tx,
  ): Promise<ReviewRow> {
    const rows = await selectRows<ReviewRow>(
      `INSERT INTO product_reviews (product_id, customer_id, order_id, author_name, rating, title, body)
       VALUES (:productId, :customerId, :orderId, :authorName, :rating, :title, :body)
       RETURNING id, product_id, customer_id, order_id, author_name, rating, title, body,
                 status, hidden_reason, hidden_at, hidden_by, created_at, updated_at`,
      input,
      tx,
    );
    return rows[0];
  },

  update(
    id: string,
    input: { rating: number; title: string | null; body: string },
    tx: Tx,
  ): Promise<number> {
    return execute(
      `UPDATE product_reviews SET rating = :rating, title = :title, body = :body WHERE id = :id`,
      { id, ...input },
      tx,
    );
  },

  delete(id: string, tx: Tx): Promise<number> {
    return execute(`DELETE FROM product_reviews WHERE id = :id`, { id }, tx);
  },

  /** Hides a review (with who and why), or brings it back when `hiddenBy` is null. */
  setHidden(
    id: string,
    hidden: { by: string; reason: string } | null,
    tx: Tx,
  ): Promise<number> {
    return execute(
      hidden
        ? `UPDATE product_reviews SET status = 'hidden', hidden_at = now(), hidden_by = :by, hidden_reason = :reason WHERE id = :id`
        : `UPDATE product_reviews SET status = 'published', hidden_at = NULL, hidden_by = NULL, hidden_reason = NULL WHERE id = :id`,
      { id, by: hidden?.by ?? null, reason: hidden?.reason ?? null },
      tx,
    );
  },

  /** Sets the product's average and count from its published reviews (empty when it has none). */
  refreshProductRating(productId: string, tx: Tx): Promise<number> {
    return execute(
      `UPDATE products p SET rating_avg = s.avg, rating_count = s.n
       FROM (SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(avg(rating)::numeric, 1) END AS avg,
                    count(*)::int AS n
             FROM product_reviews WHERE product_id = :productId AND status = 'published') s
       WHERE p.id = :productId`,
      { productId },
      tx,
    );
  },

  /** A customer who deletes their account stays in their reviews only as "Former customer". */
  anonymiseForCustomer(customerId: string, tx: Tx): Promise<number> {
    return execute(
      `UPDATE product_reviews SET author_name = 'Former customer' WHERE customer_id = :customerId`,
      { customerId },
      tx,
    );
  },

  async adminList(
    filter: AdminReviewFilter,
    limit: number,
    offset: number,
  ): Promise<{ rows: AdminReviewRow[]; total: number }> {
    const replacements = {
      status: filter.status ?? null,
      rating: filter.rating ?? null,
      productId: filter.productId ?? null,
      search: filter.search ?? null,
      pattern: likePattern(filter.search ?? ""),
    };
    const where = `WHERE (CAST(:status AS text) IS NULL OR r.status = :status)
      AND (CAST(:rating AS int) IS NULL OR r.rating = :rating)
      AND (CAST(:productId AS uuid) IS NULL OR r.product_id = :productId)
      AND (CAST(:search AS text) IS NULL OR r.body ILIKE :pattern OR r.title ILIKE :pattern
           OR r.author_name ILIKE :pattern OR p.name ILIKE :pattern)`;
    const [rows, count] = await Promise.all([
      selectRows<AdminReviewRow>(
        `SELECT ${COLUMNS}, p.name AS product_name, p.slug AS product_slug,
                c.email::text AS customer_email, (s.first_name || ' ' || s.last_name) AS hidden_by_name
         FROM product_reviews r
         JOIN products p ON p.id = r.product_id
         LEFT JOIN customers c ON c.id = r.customer_id
         LEFT JOIN staff s ON s.id = r.hidden_by
         ${where}
         ORDER BY r.created_at DESC, r.id LIMIT :limit OFFSET :offset`,
        { ...replacements, limit, offset },
      ),
      selectRows<{ n: number }>(
        `SELECT count(*)::int AS n FROM product_reviews r JOIN products p ON p.id = r.product_id ${where}`,
        replacements,
      ),
    ]);
    return { rows, total: count[0].n };
  },

  async adminFind(id: string, tx?: Tx): Promise<AdminReviewRow | undefined> {
    const rows = await selectRows<AdminReviewRow>(
      `SELECT ${COLUMNS}, p.name AS product_name, p.slug AS product_slug,
              c.email::text AS customer_email, (s.first_name || ' ' || s.last_name) AS hidden_by_name
       FROM product_reviews r
       JOIN products p ON p.id = r.product_id
       LEFT JOIN customers c ON c.id = r.customer_id
       LEFT JOIN staff s ON s.id = r.hidden_by
       WHERE r.id = :id`,
      { id },
      tx,
    );
    return rows[0];
  },
};
