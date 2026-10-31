import { Container } from "@/components/ui/container";

/** Placeholder with the same blocks as the products page while the search text is read from the URL. */
export function ProductsSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <Container className="pt-16">
        <div className="animate-pulse lg:pr-5 lg:pl-[30px]">
          <div className="h-5 w-40 rounded bg-black/10" />
          <div className="mt-5 h-12 w-2/3 rounded bg-black/10" />
          <div className="mt-6 h-5 w-1/2 rounded bg-black/10" />
        </div>
      </Container>
      <div className="mt-16 h-[94px] bg-panel" />
      <span className="sr-only">Loading products…</span>
    </div>
  );
}
