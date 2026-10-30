import { Flame, ImageIcon, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductPrice } from "@/components/shared/product-price";
import { WishlistButton } from "@/components/shared/wishlist-button";
import type { ProductSummary } from "@/types/product";
import { cn } from "@/utils/cn";

/**
 * detailed: home "featured" card. compact: home grids, name and price on one row.
 * catalog: listing page card with badge, sizes and colors.
 */
export type ProductCardVariant = "detailed" | "compact" | "catalog";

interface ProductCardProps {
  product: ProductSummary;
  variant?: ProductCardVariant;
  /** "list" puts the photo on the left and details on the right (catalog variant only). */
  layout?: "grid" | "list";
  sizes?: string;
}

const imageShape: Record<ProductCardVariant, string> = {
  detailed: "aspect-[6/7] rounded-xl",
  compact: "aspect-[12/13] rounded-2xl",
  catalog: "aspect-[17/20] rounded-[6px]",
};

function ProductImage({
  product,
  variant,
  sizes,
  className,
}: {
  product: ProductSummary;
  variant: ProductCardVariant;
  sizes: string;
  className?: string;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      tabIndex={-1}
      aria-hidden
      className={cn(
        "relative block overflow-hidden bg-muted",
        imageShape[variant],
        className,
      )}
    >
      {product.image ? (
        <Image
          src={product.image.src}
          alt={product.image.alt}
          fill
          sizes={sizes}
          style={{ objectPosition: product.image.position }}
          className="object-cover"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-muted-foreground">
          <ImageIcon aria-hidden className="size-8" />
        </span>
      )}
    </Link>
  );
}

function ColorDots({ product }: { product: ProductSummary }) {
  if (!product.colors?.length) return null;

  return (
    <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
      Color: {product.colors[0].name}
      <span className="flex items-center gap-1.5">
        {product.colors.map((color, index) => (
          <span
            key={color.name}
            title={color.name}
            className={cn(
              "size-3.5 rounded-full border border-black/15",
              index === 0 &&
                "ring-1 ring-accent ring-offset-1 ring-offset-panel",
            )}
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </span>
    </p>
  );
}

export function ProductCard({
  product,
  variant = "detailed",
  layout = "grid",
  sizes = "(min-width: 1024px) 25vw, 50vw",
}: ProductCardProps) {
  const href = `/products/${product.slug}`;
  const isList = variant === "catalog" && layout === "list";

  return (
    <article
      className={cn(
        "flex gap-3",
        variant === "catalog" && "gap-4",
        isList ? "flex-row" : "flex-col",
      )}
    >
      <div className={cn("relative", isList && "w-40 shrink-0 sm:w-56")}>
        <ProductImage product={product} variant={variant} sizes={sizes} />

        {variant === "detailed" && product.isNew ? (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[11px] font-medium shadow-card">
            New
            <Flame aria-hidden className="size-3 text-orange-500" />
          </span>
        ) : null}

        {variant === "catalog" && product.badge ? (
          <span
            className={cn(
              "absolute top-3 left-2.5 rounded-sm px-2.5 py-2 text-xs leading-none uppercase",
              product.badge.tone === "dark"
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-foreground",
            )}
          >
            {product.badge.label}
          </span>
        ) : null}

        <WishlistButton
          productName={product.name}
          className="absolute top-3 right-3"
        />
      </div>

      {variant === "detailed" ? (
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
          <ColorDots product={product} />
        </div>
      ) : null}

      {variant === "compact" ? (
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-sm font-medium">
            <Link href={href}>{product.name}</Link>
          </h3>
          <ProductPrice
            prices={product.prices}
            className="shrink-0 text-base font-semibold"
          />
        </div>
      ) : null}

      {variant === "catalog" ? (
        <div className={cn("flex flex-col gap-2", isList && "justify-center")}>
          <h3 className="max-w-48 text-base leading-7 font-semibold">
            <Link href={href}>{product.name}</Link>
          </h3>
          {product.sizes?.length ? (
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
              Sizes: {product.sizes.join(" - ")}
            </p>
          ) : null}
          <ProductPrice
            prices={product.prices}
            className="text-base font-bold"
          />
          <ColorDots product={product} />
        </div>
      ) : null}
    </article>
  );
}
