import { ProductGrid } from "@/components/shared/product-grid";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { mockNewArrivals } from "@/features/products/mock-products";

export function NewArrivalsSection() {
  return (
    <Section>
      <SectionHeading
        eyebrow="New arrivals"
        title="Explore the latest additions to our collections"
      />
      <div className="mt-8">
        <ProductGrid products={mockNewArrivals} variant="compact" />
      </div>
    </Section>
  );
}
