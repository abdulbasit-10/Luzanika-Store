import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { uuidParam } from "@/server/http/params";
import { restoreReview } from "@/server/services/admin-review-service";

/** POST /api/v1/admin/reviews/:id/restore: shows a hidden review again. */
export const POST = staffRoute<{ id: string }>(
  {
    name: "admin.reviews.restore",
    permission: "reviews.moderate",
    rateLimit: { limit: 200, windowSec: 10 * 60 },
  },
  async ({ params, admin }) =>
    json({ review: await restoreReview(admin, uuidParam(params.id)) }),
);
