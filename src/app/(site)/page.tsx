import { CategorySection } from "@/features/home/category-section";
import { FaqSection } from "@/features/home/faq-section";
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
      <FaqSection />
      <SpecialOffersSection />
    </main>
  );
}
