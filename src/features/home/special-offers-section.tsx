import { ProductGrid } from "@/components/shared/product-grid";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { MockOfferCountdown } from "@/features/home/mock-offer-countdown";
import { getCachedHomeProducts } from "@/server/catalog/catalog-queries";

export async function SpecialOffersSection() {
  const { specialOffers } = await getCachedHomeProducts();

  return (
    <Section tone="cream">
      <SectionHeading
        title={
          <>
            Special Offers <span className="text-accent">- 50%</span>
          </>
        }
        description="Discover offers on selected styles."
        action={<MockOfferCountdown />}
        className="items-start"
      />
      <div className="mt-8">
        <ProductGrid products={specialOffers} variant="compact" />
      </div>
    </Section>
  );
}
