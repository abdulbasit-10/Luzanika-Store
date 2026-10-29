import { ArrowRight } from "lucide-react";

import { ProductGrid } from "@/components/shared/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { mockFeaturedProducts } from "@/features/products/mock-products";

export function FeaturedProductsSection() {
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
        <ProductGrid products={mockFeaturedProducts} />
      </div>
    </Section>
  );
}
