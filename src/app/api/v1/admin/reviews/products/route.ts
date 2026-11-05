import { staffRoute } from "@/server/auth/staff-route";
import { json } from "@/server/http/responses";
import { listReviewedProducts } from "@/server/services/admin-review-service";

/** GET /api/v1/admin/reviews/products: the products that have reviews, by name, for the product filter. */
export const GET = staffRoute(
  { name: "admin.reviews.products", permission: "reviews.view" },
  async () => json({ items: await listReviewedProducts() }),
);
