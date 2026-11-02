import type { Metadata } from "next";

import { WishlistView } from "@/features/wishlist/wishlist-view";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Products you saved to your Luzanika wishlist.",
  robots: { index: false },
};

export default function WishlistPage() {
  return <WishlistView />;
}
