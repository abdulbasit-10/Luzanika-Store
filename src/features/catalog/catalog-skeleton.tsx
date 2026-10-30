import { PAGE_BANNER_HEIGHT } from "@/components/shared/page-banner";

export function CatalogSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <div className={`w-full animate-pulse bg-muted ${PAGE_BANNER_HEIGHT}`} />
      <span className="sr-only">Loading collection…</span>
    </div>
  );
}
