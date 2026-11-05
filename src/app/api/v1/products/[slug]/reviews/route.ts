import { customerRoute } from "@/server/auth/customer-route";
import { readSessionToken } from "@/server/auth/session-cookie";
import { ApiError } from "@/server/http/api-error";
import { created, json } from "@/server/http/responses";
import { route } from "@/server/http/route";
import { authenticate } from "@/server/services/auth-service";
import {
  createReview,
  getProductReviews,
} from "@/server/services/review-service";
import { isSlug } from "@/server/validation/catalog-schemas";
import {
  reviewBodySchema,
  reviewListQuerySchema,
} from "@/server/validation/review-schemas";

/**
 * GET /api/v1/products/:slug/reviews: the published reviews of a product,
 * newest first (page, pageSize), the star summary, and what the visitor may do
 * (`viewer`: sign in, buy it first, write one, or already wrote one).
 */
export const GET = route<{ slug: string }>(
  { name: "reviews.list" },
  async ({ params, query, request }) => {
    if (!isSlug(params.slug)) throw new ApiError("not_found");
    const { page, pageSize } = query(reviewListQuerySchema);
    const auth = await authenticate(readSessionToken(request));
    return json(
      await getProductReviews(
        params.slug,
        auth?.customer.id ?? null,
        page,
        pageSize,
      ),
    );
  },
);

/**
 * POST /api/v1/products/:slug/reviews { rating, title?, body }: only a customer
 * whose order for this product was completed, once per product.
 */
export const POST = customerRoute<{ slug: string }>(
  { name: "reviews.create", rateLimit: { limit: 30, windowSec: 60 * 60 } },
  async ({ json: readJson, params, customer }) => {
    if (!isSlug(params.slug)) throw new ApiError("not_found");
    const review = await createReview(
      customer,
      params.slug,
      await readJson(reviewBodySchema),
    );
    return created({ review }, `/api/v1/products/${params.slug}/reviews`);
  },
);
