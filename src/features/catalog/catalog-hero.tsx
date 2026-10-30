import { PageBanner } from "@/components/shared/page-banner";
import type { CategoryDefinition } from "@/features/catalog/types";

export function CatalogHero({ category }: { category: CategoryDefinition }) {
  return <PageBanner title={category.heroTitle} image={category.heroImage} />;
}
