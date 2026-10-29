export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 items-center justify-center py-section"
    >
      <span className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
