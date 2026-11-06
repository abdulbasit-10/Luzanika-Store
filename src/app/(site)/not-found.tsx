import { NotFoundView } from "@/features/not-found/not-found-view";

// Shown when a shop page says "not found" (an unknown category or product). The shop
// layout around it already has the header and footer.
export default function ShopNotFound() {
  return <NotFoundView />;
}
