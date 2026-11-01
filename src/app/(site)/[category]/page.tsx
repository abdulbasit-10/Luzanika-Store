import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CatalogBrowser } from "@/features/catalog/catalog-browser";
import { CatalogHero } from "@/features/catalog/catalog-hero";
import { CatalogSkeleton } from "@/features/catalog/catalog-skeleton";
import {
  getCachedCatalog,
  getCachedCategories,
} from "@/server/catalog/catalog-queries";

export async function generateStaticParams() {
  const categories = await getCachedCategories();
  return categories.map(({ slug }) => ({ category: slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const catalog = await getCachedCatalog(slug);
  if (!catalog) return {};

  return {
    title: catalog.category.heroTitle,
    description: catalog.category.description,
  };
}

export default function CategoryPage({ params }: PageProps<"/[category]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<CatalogSkeleton />}>
        <CategoryContent params={params} />
      </Suspense>
    </main>
  );
}

async function CategoryContent({
  params,
}: {
  params: PageProps<"/[category]">["params"];
}) {
  const { category: slug } = await params;
  const catalog = await getCachedCatalog(slug);
  if (!catalog) notFound();

  return (
    <>
      <CatalogHero category={catalog.category} />
      <CatalogBrowser {...catalog} />
    </>
  );
}
