import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductsBrowser } from "@/features/products/products-browser";
import { ProductsSkeleton } from "@/features/products/products-skeleton";
import { getCachedProductListing } from "@/server/catalog/catalog-queries";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Search and browse every Luzanika creation: clothing, bags and fragrances for Pakistan and Germany.",
};

export default function ProductsPage() {
  return (
    // Figma: a white page between the grey header and footer.
    <main className="flex-1 bg-white">
      {/* The search text is read from the URL on the client, which needs a Suspense boundary. */}
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsContent />
      </Suspense>
    </main>
  );
}

async function ProductsContent() {
  const listing = await getCachedProductListing();
  return <ProductsBrowser {...listing} />;
}
