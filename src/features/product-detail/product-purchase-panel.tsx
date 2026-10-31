"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ColorSwatches } from "@/components/shared/color-swatches";
import { SizeSelector } from "@/components/shared/size-selector";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { ProductActions } from "@/features/product-detail/product-actions";
import { SizeGuideButton } from "@/features/product-detail/size-guide-dialog";
import { blockGap } from "@/features/product-detail/spacing";
import type { ProductDetail } from "@/features/product-detail/types";
import { useCartStore } from "@/stores/cart-store";

type PurchaseProduct = Pick<
  ProductDetail,
  | "id"
  | "slug"
  | "name"
  | "images"
  | "prices"
  | "notes"
  | "colors"
  | "sizes"
  | "hasSizeGuide"
  | "category"
  | "stock"
>;

const ADDED_MESSAGE_MS = 2500;

/**
 * Everything below the price: color, size, stock, quantity, add to cart and
 * the secondary actions. Selections live in local state; "Add to Cart" saves
 * the product in the guest cart (see cart-store).
 */
export function ProductPurchasePanel({
  product,
}: {
  product: PurchaseProduct;
}) {
  const { colors, sizes } = product;
  const addItem = useCartStore((state) => state.addItem);
  const [color, setColor] = useState<string | null>(colors?.[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(sizes?.[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  function handleAddToCart() {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0],
        prices: product.prices,
        notes: product.notes,
        // The color only distinguishes cart lines when there is a choice.
        color: colors && colors.length > 1 ? (color ?? undefined) : undefined,
        size: size ?? undefined,
        maxQuantity: product.stock,
      },
      quantity,
    );
    setAdded(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAdded(false), ADDED_MESSAGE_MS);
  }

  return (
    <div>
      {colors?.length ? (
        <ColorSwatches colors={colors} value={color} onChange={setColor} />
      ) : null}

      {sizes?.length ? (
        <SizeSelector
          sizes={sizes}
          value={size}
          onChange={setSize}
          className={colors?.length ? blockGap : undefined}
        />
      ) : null}

      <div
        className={`${blockGap} flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-medium tracking-wide uppercase`}
      >
        {product.hasSizeGuide ? (
          <SizeGuideButton category={product.category?.slug} />
        ) : null}
        <p className="flex items-center gap-2">
          <Check aria-hidden className="size-4" />
          {product.stock} in stock
        </p>
      </div>

      <div className={`${blockGap} flex items-stretch gap-3`}>
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          max={product.stock}
          className="w-36 shrink-0"
        />
        <Button
          onClick={handleAddToCart}
          className="h-11 flex-1 rounded-sm text-base font-medium"
        >
          {added ? (
            <>
              <Check aria-hidden className="size-4" />
              Added to Cart
            </>
          ) : (
            "Add to Cart"
          )}
        </Button>
        <span role="status" className="sr-only">
          {added ? `${product.name} added to your cart` : ""}
        </span>
      </div>

      <div className={blockGap}>
        <ProductActions productName={product.name} />
      </div>
    </div>
  );
}
