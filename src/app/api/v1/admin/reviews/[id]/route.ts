import { staffRoute } from "@/server/auth/staff-route";
import { noContent } from "@/server/http/responses";
import { uuidParam } from "@/server/http/params";
import { deleteReviewByStaff } from "@/server/services/admin-review-service";

/** DELETE /api/v1/admin/reviews/:id deletes a review for good, whatever its status. The audit log keeps its text. */
export const DELETE = staffRoute<{ id: string }>(
  {
    name: "admin.reviews.delete",
    permission: "reviews.moderate",
    rateLimit: { limit: 200, windowSec: 10 * 60 },
  },
  async ({ params, admin }) => {
    await deleteReviewByStaff(admin, uuidParam(params.id));
    return noContent();
  },
);
