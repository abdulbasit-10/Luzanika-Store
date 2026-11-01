import { ProductGrid } from "@/components/shared/product-grid";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCachedHomeProducts } from "@/server/catalog/catalog-queries";

export async function NewArrivalsSection() {
  const { newArrivals } = await getCachedHomeProducts();

  return (
    <Section>
      <SectionHeading
        eyebrow="New arrivals"
        title="Explore the latest additions to our collections"
      />
      <div className="mt-8">
        <ProductGrid products={newArrivals} variant="compact" />
      </div>
    </Section>
  );
}
