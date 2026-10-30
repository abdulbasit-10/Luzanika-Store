export function CatalogSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <div className="h-56 w-full animate-pulse bg-muted sm:h-72 lg:h-[min(41.67vw,calc(100dvh-var(--header-height)))] lg:min-h-64" />
      <span className="sr-only">Loading collection…</span>
    </div>
  );
}
