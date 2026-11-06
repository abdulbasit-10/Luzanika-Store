import { CategorySection } from "@/features/home/category-section";
// The FAQ section is hidden on the home page for now. To show it again, remove the two comment marks
// (this import and the <FaqSection /> line below). The FAQ page itself is unchanged.
// import { FaqSection } from "@/features/home/faq-section";
import { FeaturedProductsSection } from "@/features/home/featured-products-section";
import { HeroSection } from "@/features/home/hero-section";
import { NewArrivalsSection } from "@/features/home/new-arrivals-section";
import { SpecialOffersSection } from "@/features/home/special-offers-section";

export default function Home() {
  return (
    // Figma: a white page between the grey header and footer.
    <main className="flex-1 bg-white">
      <HeroSection />
      <CategorySection />
      <FeaturedProductsSection />
      <NewArrivalsSection />
      {/* <FaqSection /> */}
      <SpecialOffersSection />
    </main>
  );
}
