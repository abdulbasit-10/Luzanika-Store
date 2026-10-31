import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductsBrowser } from "@/features/products/products-browser";
import { ProductsSkeleton } from "@/features/products/products-skeleton";
import { getProductListing } from "@/features/products/product-listing";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Search and browse every Luzanika creation: clothing, bags and fragrances for Pakistan and Germany.",
};

export default function ProductsPage() {
  const listing = getProductListing();

  return (
    <main className="flex-1">
      {/* The search text is read from the URL on the client, which needs a Suspense boundary. */}
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsBrowser {...listing} />
      </Suspense>
    </main>
  );
}
