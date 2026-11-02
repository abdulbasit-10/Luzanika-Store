import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductDetailSkeleton } from "@/features/product-detail/product-detail-skeleton";
import { ProductDetailView } from "@/features/product-detail/product-detail-view";
import {
  getProduct,
  listProductSlugs,
} from "@/features/product-detail/product-service";

export function generateStaticParams() {
  return listProductSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};

  const image = product.images[0];
  return {
    title: product.name,
    description: product.tagline,
    openGraph: image
      ? { images: [{ url: image.src, alt: image.alt }] }
      : undefined,
  };
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </main>
  );
}

async function ProductContent({
  params,
}: {
  params: PageProps<"/products/[slug]">["params"];
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  return <ProductDetailView product={product} />;
}
