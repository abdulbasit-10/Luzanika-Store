import { ProductGrid } from "@/components/shared/product-grid";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  OfferExpiry,
  OfferTimer,
  OfferTitle,
} from "@/features/home/offer-parts";
import { getCachedHomeProducts } from "@/server/catalog/catalog-queries";

/**
 * The home page offers row. Staff choose its products, an optional headline and
 * an optional end time; the "% off" is worked out from the products' real old
 * and new prices. The row is not shown when it has no products, and the catalogue leaves its products out once the end time has passed.
 */
export async function SpecialOffersSection() {
  const { specialOffers, offer } = await getCachedHomeProducts();
  const endsAt = offer.endsAt ? new Date(offer.endsAt).getTime() : null;

  if (specialOffers.length === 0) return null;

  return (
    <OfferExpiry endsAt={endsAt}>
      <Section tone="cream">
        <SectionHeading
          title={
            <OfferTitle
              headline={offer.headline}
              productPrices={specialOffers.map((product) => product.prices)}
            />
          }
          description="Discover offers on selected styles."
          action={endsAt !== null ? <OfferTimer endsAt={endsAt} /> : undefined}
          className="items-start"
        />
        <div className="mt-8">
          <ProductGrid products={specialOffers} variant="compact" />
        </div>
      </Section>
    </OfferExpiry>
  );
}
