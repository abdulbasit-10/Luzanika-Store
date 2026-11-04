import "server-only";

import { recordAudit } from "@/server/audit/audit";
import { refreshCatalogCache } from "@/server/catalog/refresh-cache";
import { withTransaction } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import {
  reviewRepository,
  type AdminReviewFilter,
  type AdminReviewRow,
} from "@/server/repositories/review-repository";
import type { AdminContext } from "@/server/services/staff-admin-service";

export interface AdminReviewDto {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  status: "published" | "hidden";
  hiddenReason: string | null;
  hiddenAt: string | null;
  hiddenBy: string | null;
  product: { id: string; name: string; slug: string };
  customer: { id: string; email: string } | null;
  createdAt: string;
}

const iso = (value: Date) => new Date(value).toISOString();

function toDto(row: AdminReviewRow): AdminReviewDto {
  return {
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    authorName: row.author_name,
    status: row.status,
    hiddenReason: row.hidden_reason,
    hiddenAt: row.hidden_at ? iso(row.hidden_at) : null,
    hiddenBy: row.hidden_by_name,
    product: {
      id: row.product_id,
      name: row.product_name,
      slug: row.product_slug,
    },
    customer:
      row.customer_id && row.customer_email
        ? { id: row.customer_id, email: row.customer_email }
        : null,
    createdAt: iso(row.created_at),
  };
}

export async function listReviews(
  filter: AdminReviewFilter,
  page: number,
  pageSize: number,
) {
  const { rows, total } = await reviewRepository.adminList(
    filter,
    pageSize,
    (page - 1) * pageSize,
  );
  return { items: rows.map(toDto), total, page, pageSize };
}

async function getReview(id: string): Promise<AdminReviewDto> {
  const row = await reviewRepository.adminFind(id);
  if (!row) throw new ApiError("not_found");
  return toDto(row);
}

/** Hides a review from the shop (and from the rating) with a reason. Nothing is deleted. */
export async function hideReview(
  ctx: AdminContext,
  id: string,
  reason: string,
): Promise<AdminReviewDto> {
  await withTransaction(async (tx) => {
    const row = await reviewRepository.lockById(id, tx);
    if (!row) throw new ApiError("not_found");
    if (row.status === "hidden") {
      throw new ApiError("conflict", {
        message: "This review is already hidden.",
      });
    }
    await reviewRepository.setHidden(id, { by: ctx.actor.id, reason }, tx);
    await reviewRepository.refreshProductRating(row.product_id, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "reviews.hide",
        entityType: "review",
        entityId: id,
        before: { status: "published", rating: row.rating },
        after: { status: "hidden", reason },
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
  return getReview(id);
}

/** Shows a hidden review again. */
export async function restoreReview(
  ctx: AdminContext,
  id: string,
): Promise<AdminReviewDto> {
  await withTransaction(async (tx) => {
    const row = await reviewRepository.lockById(id, tx);
    if (!row) throw new ApiError("not_found");
    if (row.status !== "hidden") {
      throw new ApiError("conflict", {
        message: "This review is not hidden.",
      });
    }
    await reviewRepository.setHidden(id, null, tx);
    await reviewRepository.refreshProductRating(row.product_id, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "reviews.restore",
        entityType: "review",
        entityId: id,
        before: { status: "hidden", reason: row.hidden_reason },
        after: { status: "published", rating: row.rating },
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
  return getReview(id);
}
