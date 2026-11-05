import type { Metadata } from "next";

import { AdminReviewsView } from "@/features/admin-reviews/admin-reviews-view";

export const metadata: Metadata = { title: "Reviews" };

export const instant = false;

export default function AdminReviewsPage() {
  return <AdminReviewsView />;
}
