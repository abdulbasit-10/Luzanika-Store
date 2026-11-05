import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { uuidParam } from "@/server/http/params";
import { publishReview } from "@/server/services/admin-review-service";

/** POST /api/v1/admin/reviews/:id/publish: approves a pending review. It then shows on the product page and counts in the stars. */
export const POST = staffRoute<{ id: string }>(
  {
    name: "admin.reviews.publish",
    permission: "reviews.moderate",
    rateLimit: { limit: 200, windowSec: 10 * 60 },
  },
  async ({ params, admin }) =>
    json({ review: await publishReview(admin, uuidParam(params.id)) }),
);
