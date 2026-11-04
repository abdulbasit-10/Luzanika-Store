import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { uuidParam } from "@/server/http/params";
import { hideReview } from "@/server/services/admin-review-service";
import { hideReviewSchema } from "@/server/validation/review-schemas";

/** POST /api/v1/admin/reviews/:id/hide { reason }: takes the review off the shop and out of the rating. Nothing is deleted. */
export const POST = staffRoute<{ id: string }>(
  {
    name: "admin.reviews.hide",
    permission: "reviews.moderate",
    rateLimit: { limit: 200, windowSec: 10 * 60 },
  },
  async ({ json: readJson, params, admin }) =>
    json({
      review: await hideReview(
        admin,
        uuidParam(params.id),
        (await readJson(hideReviewSchema)).reason,
      ),
    }),
);
