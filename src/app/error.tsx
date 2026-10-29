"use client";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-narrow flex-1 flex-col items-center justify-center gap-4 px-gutter py-section text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        {error.digest
          ? `An unexpected error occurred (ref: ${error.digest}).`
          : "An unexpected error occurred."}
      </p>
      <button type="button" className="btn-primary" onClick={() => retry()}>
        Try again
      </button>
    </main>
  );
}
