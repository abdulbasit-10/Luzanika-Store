import { Flame, ImageIcon, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductPrice } from "@/components/shared/product-price";
import { WishlistButton } from "@/components/shared/wishlist-button";
import type { ProductSummary } from "@/types/product";
import { cn } from "@/utils/cn";

export type ProductCardVariant = "detailed" | "compact";

interface ProductCardProps {
  product: ProductSummary;
  variant?: ProductCardVariant;
  sizes?: string;
}

export function ProductCard({
  product,
  variant = "detailed",
  sizes = "(min-width: 1024px) 25vw, 50vw",
}: ProductCardProps) {
  const href = `/products/${product.slug}`;
  const isDetailed = variant === "detailed";

  return (
    <article className="flex flex-col gap-3">
      <div className="relative">
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className={cn(
            "relative block overflow-hidden bg-muted",
            isDetailed
              ? "aspect-[6/7] rounded-xl"
              : "aspect-square rounded-2xl",
          )}
        >
          {product.image ? (
            <Image
              src={product.image.src}
              alt={product.image.alt}
              fill
              sizes={sizes}
              className="object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon aria-hidden className="size-8" />
            </span>
          )}
        </Link>
        {isDetailed && product.isNew ? (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[11px] font-medium shadow-card">
            New
            <Flame aria-hidden className="size-3 text-orange-500" />
          </span>
        ) : null}
        <WishlistButton
          productName={product.name}
          className="absolute top-3 right-3"
        />
      </div>

      {isDetailed ? (
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-base font-semibold">
            <Link href={href}>{product.name}</Link>
          </h3>
          {product.rating !== undefined ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star aria-hidden className="size-3 fill-accent text-accent" />
              <span className="sr-only">Rating:</span>
              {product.rating.toFixed(1)}
            </p>
          ) : null}
          <ProductPrice
            prices={product.prices}
            className="text-lg font-semibold"
          />
          {product.color ? (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              Color: {product.color.name}
              <span
                aria-hidden
                className="size-2 rounded-full border border-border"
                style={{ backgroundColor: product.color.hex }}
              />
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-sm font-medium">
            <Link href={href}>{product.name}</Link>
          </h3>
          <ProductPrice
            prices={product.prices}
            className="shrink-0 text-base font-semibold"
          />
        </div>
      )}
    </article>
  );
}
