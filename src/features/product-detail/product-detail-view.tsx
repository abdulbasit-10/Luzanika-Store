import { Eye } from "lucide-react";

import { ProductPrice } from "@/components/shared/product-price";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Container } from "@/components/ui/container";
import { RatingStars } from "@/components/ui/rating-stars";
import { SpecialOffersSection } from "@/features/home/special-offers-section";
import { ProductDetailsSection } from "@/features/product-detail/product-details-section";
import { ProductGallery } from "@/features/product-detail/product-gallery";
import { ProductPurchasePanel } from "@/features/product-detail/product-purchase-panel";
import { blockGap } from "@/features/product-detail/spacing";
import type { ProductDetail } from "@/features/product-detail/types";

function getBreadcrumb(product: ProductDetail): BreadcrumbItem[] {
  const { category, subcategoryLabel } = product;
  if (!category) return [{ label: "Home", href: "/" }, { label: product.name }];

  return [
    { label: "Home", href: "/" },
    { label: category.label, href: `/${category.slug}` },
    ...(subcategoryLabel
      ? [{ label: subcategoryLabel, href: `/${category.slug}` }]
      : []),
    { label: product.name },
  ];
}

export function ProductDetailView({ product }: { product: ProductDetail }) {
  return (
    <>
      <Container className="pt-6 pb-16">
        <div className="grid gap-8 lg:grid-cols-[auto_minmax(0,34rem)] lg:justify-center lg:gap-12">
          <ProductGallery
            images={product.images}
            productName={product.name}
            isNew={product.isNew}
          />

          <div>
            <Breadcrumb items={getBreadcrumb(product)} />
            <h1 className="mt-3 font-heading text-[clamp(1.5rem,4.2dvh,2.5rem)] leading-tight font-medium">
              {product.name}
            </h1>
            {product.tagline ? (
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                {product.tagline}
              </p>
            ) : null}
            {product.rating !== undefined ? (
              <RatingStars
                className="mt-2"
                rating={product.rating}
                reviewCount={product.reviewCount}
              />
            ) : null}
            <ProductPrice
              prices={product.prices}
              className={`${blockGap} block text-[clamp(1.375rem,3.6dvh,2rem)] leading-tight font-bold`}
            />
            {product.viewersNow ? (
              <p
                className={`${blockGap} flex items-center gap-2 text-xs font-medium`}
              >
                <Eye aria-hidden className="size-4" />
                {product.viewersNow} people are looking at this product
              </p>
            ) : null}
            <hr className={`${blockGap} border-black/[0.06]`} />
            <div className={blockGap}>
              <ProductPurchasePanel product={product} />
            </div>
          </div>
        </div>

        {product.details?.length ? (
          <div className="mt-20 lg:mt-28">
            <ProductDetailsSection sections={product.details} />
          </div>
        ) : null}
      </Container>

      <SpecialOffersSection />
    </>
  );
}
