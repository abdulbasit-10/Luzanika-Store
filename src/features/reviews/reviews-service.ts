import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  verifiedPurchase: true;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
}

/** The visitor's own review also says whether our team hid it. */
export interface OwnReview extends Review {
  status: "published" | "hidden";
}

export type ReviewViewer =
  | { state: "sign_in" | "needs_purchase" | "can_review" }
  | { state: "already_reviewed"; mine: OwnReview };

export interface ProductReviews {
  summary: {
    average: number | null;
    count: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  items: Review[];
  total: number;
  page: number;
  pageSize: number;
  viewer: ReviewViewer;
}

export interface ReviewInput {
  rating: number;
  title: string | null;
  body: string;
}

const base = (slug: string) => `/products/${encodeURIComponent(slug)}/reviews`;

/** GET /products/:slug/reviews: newest first. */
export const fetchReviews = (slug: string, page: number, pageSize: number) =>
  apiGet<ProductReviews>(base(slug), { params: { page, pageSize } });

export const createReview = (slug: string, input: ReviewInput) =>
  apiPost<{ review: OwnReview }>(base(slug), input);

export const updateReview = (id: string, input: ReviewInput) =>
  apiPatch<{ review: OwnReview }>(`/reviews/${encodeURIComponent(id)}`, input);

export const deleteReview = (id: string) =>
  apiDelete(`/reviews/${encodeURIComponent(id)}`);
