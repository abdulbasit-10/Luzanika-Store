import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

/** The shop pages: header and footer around the page. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
