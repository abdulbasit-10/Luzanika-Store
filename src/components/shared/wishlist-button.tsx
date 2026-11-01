"use client";

import { Heart } from "lucide-react";

import { useWishlist } from "@/features/wishlist/use-wishlist";
import type { WishlistProduct } from "@/features/wishlist/wishlist-service";
import { cn } from "@/utils/cn";

interface WishlistButtonProps {
  product: WishlistProduct;
  className?: string;
}

/** Heart on a product card. Filled when the product is in the signed-in user's wishlist. */
export function WishlistButton({ product, className }: WishlistButtonProps) {
  const { has, toggle } = useWishlist();
  const active = has(product.id);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${active ? "Remove" : "Add"} ${product.name} ${active ? "from" : "to"} wishlist`}
      onClick={() => toggle(product)}
      className={cn(
        "flex size-8 items-center justify-center rounded-full bg-surface shadow-card transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Heart
        aria-hidden
        className={cn(
          "size-4",
          active ? "fill-red-500 text-red-500" : "text-foreground",
        )}
      />
    </button>
  );
}
