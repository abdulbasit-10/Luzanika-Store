import { customerRoute } from "@/server/auth/customer-route";
import { json, noContent } from "@/server/http/responses";
import { uuidParam } from "@/server/http/params";
import { deleteReview, updateReview } from "@/server/services/review-service";
import { reviewBodySchema } from "@/server/validation/review-schemas";

/** PATCH /api/v1/reviews/:id { rating, title?, body }: the customer changes their own review. */
export const PATCH = customerRoute<{ id: string }>(
  { name: "reviews.update", rateLimit: { limit: 20, windowSec: 60 * 60 } },
  async ({ json: readJson, params, customer }) =>
    json({
      review: await updateReview(
        customer,
        uuidParam(params.id),
        await readJson(reviewBodySchema),
      ),
    }),
);

/** DELETE /api/v1/reviews/:id: the customer removes their own review. */
export const DELETE = customerRoute<{ id: string }>(
  { name: "reviews.delete", rateLimit: { limit: 20, windowSec: 60 * 60 } },
  async ({ params, customer }) => {
    await deleteReview(customer, uuidParam(params.id));
    return noContent();
  },
);
