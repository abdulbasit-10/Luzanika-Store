import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ButtonLink } from "@/components/ui/button";

// Unmatched URLs are rendered by the root layout only, so the header and
// footer are added here.
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-narrow flex-1 flex-col items-center justify-center gap-4 px-gutter py-section text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground">
          The page you are looking for does not exist.
        </p>
        <ButtonLink href="/">Back to home</ButtonLink>
      </main>
      <Footer />
    </>
  );
}
