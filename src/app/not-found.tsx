import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { NotFoundView } from "@/features/not-found/not-found-view";

// A URL that matches no page at all is rendered by the root layout only, so the
// header and footer are added here. Inside the shop (see (site)/not-found.tsx) the
// shop layout already has them.
export default function NotFound() {
  return (
    <>
      <Header />
      <NotFoundView />
      <Footer />
    </>
  );
}
