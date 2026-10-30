import { CategorySection } from "@/features/home/category-section";
import { FaqSection } from "@/features/home/faq-section";
import { FeaturedProductsSection } from "@/features/home/featured-products-section";
import { HeroSection } from "@/features/home/hero-section";
import { NewArrivalsSection } from "@/features/home/new-arrivals-section";
import { SpecialOffersSection } from "@/features/home/special-offers-section";

export default function Home() {
  return (
    <main className="flex-1">
      <HeroSection />
      <CategorySection />
      <FeaturedProductsSection />
      <NewArrivalsSection />
      <FaqSection />
      <SpecialOffersSection />
    </main>
  );
}
