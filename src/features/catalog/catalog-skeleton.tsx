import { CATALOG_HERO_HEIGHT } from "@/features/catalog/catalog-hero";

export function CatalogSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <div className={`w-full animate-pulse bg-muted ${CATALOG_HERO_HEIGHT}`} />
      <span className="sr-only">Loading collection…</span>
    </div>
  );
}
