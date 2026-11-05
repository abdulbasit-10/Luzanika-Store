import "server-only";

import { refreshCatalogCache } from "@/server/catalog/refresh-cache";
import { withTransaction } from "@/server/db/transaction";
import { isUniqueViolation } from "@/server/db/errors";
import { ApiError } from "@/server/http/api-error";
import { catalogRepository } from "@/server/repositories/catalog-repository";
import type { CustomerRecord } from "@/server/repositories/customer-repository";
import {
  reviewRepository,
  type ReviewRow,
} from "@/server/repositories/review-repository";
import type { ReviewBody } from "@/server/validation/review-schemas";

export interface ReviewDto {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  /** Every review comes from a customer whose order for this product was completed. */
  verifiedPurchase: true;
  createdAt: string;
  updatedAt: string;
}

/** The customer's own review also says whether staff have hidden it. */
export interface OwnReviewDto extends ReviewDto {
  status: "pending" | "published" | "hidden";
}

/**
 * What the visitor may do on this product's review box:
 * `sign_in` (not signed in), `needs_purchase` (no completed order with it),
 * `can_review`, or `already_reviewed` (then `mine` is their review).
 */
export type ReviewViewer =
  | { state: "sign_in" | "needs_purchase" | "can_review" }
  | { state: "already_reviewed"; mine: OwnReviewDto };

export interface ProductReviewsDto {
  summary: {
    average: number | null;
    count: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  items: ReviewDto[];
  total: number;
  page: number;
  pageSize: number;
  viewer: ReviewViewer;
}

const iso = (value: Date) => new Date(value).toISOString();

export function toReviewDto(row: ReviewRow): ReviewDto {
  return {
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    authorName: row.author_name,
    verifiedPurchase: true,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

const toOwnDto = (row: ReviewRow): OwnReviewDto => ({
  ...toReviewDto(row),
  status: row.status,
});

/** "Ayesha K.": the first name and the first letter of the last name. */
export function authorNameOf(customer: {
  firstName: string;
  lastName: string;
}): string {
  const first = customer.firstName.trim();
  const last = customer.lastName.trim();
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

async function findProduct(slug: string) {
  const product = await catalogRepository.findProductBySlug(slug);
  if (!product) throw new ApiError("not_found");
  return product;
}

/** The reviews of a product page, newest first, with the star summary and what this visitor may do. */
export async function getProductReviews(
  slug: string,
  customerId: string | null,
  page: number,
  pageSize: number,
): Promise<ProductReviewsDto> {
  const product = await findProduct(slug);
  const [summary, list] = await Promise.all([
    reviewRepository.summary(product.id),
    reviewRepository.listPublished(product.id, pageSize, (page - 1) * pageSize),
  ]);

  let viewer: ReviewViewer = { state: "sign_in" };
  if (customerId) {
    const mine = await reviewRepository.findByCustomerAndProduct(
      customerId,
      product.id,
    );
    if (mine) {
      viewer = { state: "already_reviewed", mine: toOwnDto(mine) };
    } else {
      const order = await reviewRepository.findQualifyingOrder(
        customerId,
        product.id,
      );
      viewer = { state: order ? "can_review" : "needs_purchase" };
    }
  }

  return {
    summary,
    items: list.rows.map(toReviewDto),
    total: list.total,
    page,
    pageSize,
    viewer,
  };
}

/**
 * Writes a review. Only a customer with a completed order for the product may,
 * once per product. It starts as pending: the shop and the rating show it only
 * after staff publish it.
 */
export async function createReview(
  customer: CustomerRecord,
  slug: string,
  body: ReviewBody,
): Promise<OwnReviewDto> {
  const product = await findProduct(slug);
  let row: ReviewRow;
  try {
    row = await withTransaction(async (tx) => {
      const orderId = await reviewRepository.findQualifyingOrder(
        customer.id,
        product.id,
        tx,
      );
      if (!orderId) {
        throw new ApiError("forbidden", {
          message:
            "Only customers whose order for this product was delivered can review it.",
        });
      }
      const inserted = await reviewRepository.insert(
        {
          productId: product.id,
          customerId: customer.id,
          orderId,
          authorName: authorNameOf(customer),
          rating: body.rating,
          title: body.title,
          body: body.body,
        },
        tx,
      );
      return inserted;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError("conflict", {
        message:
          "You have already reviewed this product. You can change your review.",
      });
    }
    throw error;
  }
  return toOwnDto(row);
}

async function ownReview(
  customerId: string,
  id: string,
  tx: Parameters<typeof reviewRepository.lockById>[1],
): Promise<ReviewRow> {
  const row = await reviewRepository.lockById(id, tx);
  // Someone else's review is "not found", so ids cannot be probed.
  if (!row || row.customer_id !== customerId) throw new ApiError("not_found");
  return row;
}

/**
 * A customer changes their own review. A published review goes back to pending
 * (staff look at the new text first); a pending one stays pending. A review
 * staff hid cannot be edited.
 */
export async function updateReview(
  customer: CustomerRecord,
  id: string,
  body: ReviewBody,
): Promise<OwnReviewDto> {
  const row = await withTransaction(async (tx) => {
    const current = await ownReview(customer.id, id, tx);
    if (current.status === "hidden") {
      throw new ApiError("conflict", {
        message: "This review was hidden by our team and cannot be changed.",
      });
    }
    await reviewRepository.update(
      id,
      { rating: body.rating, title: body.title, body: body.body },
      tx,
    );
    if (current.status === "published") {
      await reviewRepository.setPending(id, tx);
      await reviewRepository.refreshProductRating(current.product_id, tx);
    }
    return {
      row: (await reviewRepository.findById(id, tx)) as ReviewRow,
      wasPublished: current.status === "published",
    };
  });
  if (row.wasPublished) refreshCatalogCache();
  return toOwnDto(row.row);
}

/** A customer removes their own review. */
export async function deleteReview(
  customer: CustomerRecord,
  id: string,
): Promise<void> {
  await withTransaction(async (tx) => {
    const current = await ownReview(customer.id, id, tx);
    await reviewRepository.delete(id, tx);
    await reviewRepository.refreshProductRating(current.product_id, tx);
  });
  refreshCatalogCache();
}
