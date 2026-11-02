"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { headerActions } from "@/config/navigation";
import { getItemCount } from "@/features/cart/cart-totals";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCartStore } from "@/stores/cart-store";

const MAX_BADGE = 99;

/** Header cart icon with the number of items in the cart. The cart only exists in the browser, so the badge waits for hydration. */
export function CartLink() {
  const hydrated = useHydrated();
  const count = useCartStore((state) => getItemCount(state.lines));
  const shown = hydrated ? count : 0;

  return (
    <Link
      href={headerActions.cart.href}
      aria-label={
        shown > 0
          ? `${headerActions.cart.label}, ${shown} ${shown === 1 ? "item" : "items"}`
          : headerActions.cart.label
      }
      className="relative flex items-center justify-center"
    >
      <ShoppingBag aria-hidden className="size-4.5" />
      {shown > 0 ? (
        <span
          aria-hidden
          className="absolute -top-2 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground"
        >
          {shown > MAX_BADGE ? `${MAX_BADGE}+` : shown}
        </span>
      ) : null}
    </Link>
  );
}
