"use client";

import { Check, Ruler } from "lucide-react";
import { useState } from "react";

import { ColorSwatches } from "@/components/shared/color-swatches";
import { SizeSelector } from "@/components/shared/size-selector";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { ProductActions } from "@/features/product-detail/product-actions";
import { blockGap } from "@/features/product-detail/spacing";
import type { ProductDetail } from "@/features/product-detail/types";

type PurchaseProduct = Pick<
  ProductDetail,
  "name" | "colors" | "sizes" | "hasSizeGuide" | "stock"
>;

/**
 * Everything below the price: color, size, stock, quantity, add to cart and
 * the secondary actions. Selections live in local state; adding to the cart is
 * wired up when the cart feature is built.
 */
export function ProductPurchasePanel({
  product,
}: {
  product: PurchaseProduct;
}) {
  const { colors, sizes } = product;
  const [color, setColor] = useState<string | null>(colors?.[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(sizes?.[0] ?? null);
  const [quantity, setQuantity] = useState(1);

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
          <button
            type="button"
            className="flex items-center gap-2 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Ruler aria-hidden className="size-4" />
            Size guide
          </button>
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
        <Button className="h-11 flex-1 rounded-sm text-base font-medium">
          Add to Cart
        </Button>
      </div>

      <div className={blockGap}>
        <ProductActions productName={product.name} />
      </div>
    </div>
  );
}
