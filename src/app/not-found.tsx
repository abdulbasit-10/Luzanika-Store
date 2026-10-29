import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-narrow flex-1 flex-col items-center justify-center gap-4 px-gutter py-section text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <ButtonLink href="/">Back to home</ButtonLink>
    </main>
  );
}
