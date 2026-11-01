import { ArrowRight } from "lucide-react";

import { ProductGrid } from "@/components/shared/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCachedHomeProducts } from "@/server/catalog/catalog-queries";

export async function FeaturedProductsSection() {
  const { featured } = await getCachedHomeProducts();

  return (
    <Section tone="cream">
      <SectionHeading
        eyebrow="Featured products"
        title="Discover our selected styles"
        action={
          <ButtonLink href="/products" size="sm">
            View All Product
            <ArrowRight aria-hidden className="size-3.5" />
          </ButtonLink>
        }
      />
      <div className="mt-8">
        <ProductGrid products={featured} />
      </div>
    </Section>
  );
}
