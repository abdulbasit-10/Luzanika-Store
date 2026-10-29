import { ProductGrid } from "@/components/shared/product-grid";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { mockSpecialOffers } from "@/features/products/mock-products";

export function SpecialOffersSection() {
  return (
    <Section tone="cream">
      <SectionHeading
        title={
          <>
            Special Offers <span className="text-accent">- 50%</span>
          </>
        }
        description="Discover offers on selected styles."
      />
      <div className="mt-8">
        <ProductGrid products={mockSpecialOffers} variant="compact" />
      </div>
    </Section>
  );
}
