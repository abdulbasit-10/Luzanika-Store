import { apiGet, apiPost } from "@/lib/api-client";

export type ReviewStatus = "published" | "hidden";

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
