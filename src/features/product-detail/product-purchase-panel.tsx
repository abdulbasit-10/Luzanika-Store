"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ColorSwatches } from "@/components/shared/color-swatches";
import { SizeSelector } from "@/components/shared/size-selector";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { toast } from "@/components/ui/toaster";
import { ProductActions } from "@/features/product-detail/product-actions";
import { SizeGuideButton } from "@/features/product-detail/size-guide-dialog";
import { blockGap } from "@/features/product-detail/spacing";
import type { ProductDetail } from "@/features/product-detail/types";
import { useCart } from "@/features/cart/use-cart";
import { useUiStore } from "@/stores/ui-store";

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
  | "variants"
>;

const ADDED_MESSAGE_MS = 2500;

/**
 * Everything below the price: color, size, stock, quantity, add to cart and
 * the secondary actions. Selections live in local state and pick one variant,
 * whose stock in the selected region limits the quantity. "Add to Cart" saves
 * the product in the signed-in customer's cart (see cart-store).
 */
export function ProductPurchasePanel({
  product,
}: {
  product: PurchaseProduct;
}) {
  const { colors, sizes, variants } = product;
  const region = useUiStore((state) => state.region);
  const { addItem } = useCart();
  const router = useRouter();
  const [color, setColor] = useState<string | null>(colors?.[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(sizes?.[0] ?? null);
  const [chosenQuantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const variant = variants.find(
    (item) =>
      (!colors?.length || item.color === color) &&
      (!sizes?.length || item.size === size),
  );
  const stock = variant?.stock[region] ?? 0;
  const inStock = stock > 0;
  // Clearing a choice leaves no variant; that is "pick an option", not "sold out".
  const missingChoice =
    colors?.length && color === null
      ? "colour"
      : sizes?.length && size === null
        ? "size"
        : null;
  // A smaller stock after changing size, colour or region must never leave a larger quantity selected.
  const quantity = Math.min(chosenQuantity, Math.max(stock, 1));

  function handleAddToCart() {
    if (!inStock) return;
    const saved = addItem(
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
        maxQuantity: stock,
      },
      quantity,
    );
    // Not signed in: addItem has already asked the visitor to log in.
    if (!saved) return;
    setAdded(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAdded(false), ADDED_MESSAGE_MS);
    // One toast per product page: adding again updates it instead of stacking.
    toast.success(`${product.name} added to your cart`, {
      id: "cart-add",
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
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
          {missingChoice ? (
            `Select a ${missingChoice}`
          ) : inStock ? (
            <>
              <Check aria-hidden className="size-4" />
              {stock} in stock
            </>
          ) : (
            <>
              <X aria-hidden className="size-4" />
              Out of stock
            </>
          )}
        </p>
      </div>

      <div className={`${blockGap} flex items-stretch gap-3`}>
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          max={Math.max(stock, 1)}
          className="w-36 shrink-0"
        />
        <Button
          onClick={handleAddToCart}
          disabled={!inStock}
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
      </div>

      <div className={blockGap}>
        <ProductActions
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            image: product.images[0],
            prices: product.prices,
          }}
        />
      </div>
    </div>
  );
}
