import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { listReviews } from "@/server/services/admin-review-service";
import { adminReviewListQuerySchema } from "@/server/validation/review-schemas";

/** GET /api/v1/admin/reviews: newest first. Filters: status (pending, published, hidden), rating (1 to 5), productId, search (text, title, author, product name), page, pageSize. */
export const GET = staffRoute(
  { name: "admin.reviews.list", permission: "reviews.view" },
  async ({ query }) => {
    const { page, pageSize, ...filter } = query(adminReviewListQuerySchema);
    return json(await listReviews(filter, page, pageSize));
  },
);
