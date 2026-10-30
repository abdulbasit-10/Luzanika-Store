export function ProductDetailSkeleton() {
  return (
    <div role="status" aria-live="polite" className="pt-6">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-(--page-pad) lg:grid-cols-[auto_minmax(0,34rem)] lg:justify-center lg:gap-12">
        <div className="mx-auto aspect-[3/4] w-full max-w-md animate-pulse bg-muted lg:mx-0 lg:w-[max(15rem,min(40rem,44vw,calc((100dvh-var(--header-height)-3rem)*0.652)))]" />
        <div className="flex flex-col gap-4">
          <div className="h-4 w-48 animate-pulse bg-muted" />
          <div className="h-16 w-full animate-pulse bg-muted" />
          <div className="h-10 w-32 animate-pulse bg-muted" />
        </div>
      </div>
      <span className="sr-only">Loading product…</span>
    </div>
  );
}
