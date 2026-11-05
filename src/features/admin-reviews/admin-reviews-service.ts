import { apiDelete, apiGet, apiPost } from "@/lib/api-client";

export type ReviewStatus = "pending" | "published" | "hidden";

export interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  status: ReviewStatus;
  hiddenReason: string | null;
  /** ISO 8601. */
  hiddenAt: string | null;
  hiddenBy: string | null;
  product: { id: string; name: string; slug: string };
  customer: { id: string; email: string } | null;
  createdAt: string;
}

export interface AdminReviewPage {
  items: AdminReview[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReviewFilters {
  search?: string;
  status?: ReviewStatus;
  rating?: number;
  productId?: string;
}

export const fetchReviews = (
  filters: ReviewFilters,
  page: number,
  pageSize: number,
) =>
  apiGet<AdminReviewPage>("/admin/reviews", {
    params: {
      search: filters.search?.trim() || undefined,
      status: filters.status,
      rating: filters.rating,
      productId: filters.productId,
      page,
      pageSize,
    },
  });

export const hideReview = (id: string, reason: string) =>
  apiPost(`/admin/reviews/${encodeURIComponent(id)}/hide`, {
    reason: reason.trim(),
  });

export const restoreReview = (id: string) =>
  apiPost(`/admin/reviews/${encodeURIComponent(id)}/restore`);

export const publishReview = (id: string) =>
  apiPost(`/admin/reviews/${encodeURIComponent(id)}/publish`);

/** Deletes the review for good. */
export const deleteReview = (id: string) =>
  apiDelete(`/admin/reviews/${encodeURIComponent(id)}`);

/** The products that have reviews, for the product filter. */
export const fetchReviewedProducts = () =>
  apiGet<{ items: { id: string; name: string }[] }>("/admin/reviews/products");
