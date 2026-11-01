"use client";

import { Heart } from "lucide-react";
import Link from "next/link";

import { headerActions } from "@/config/navigation";
import { useWishlist } from "@/features/wishlist/use-wishlist";

const MAX_BADGE = 99;

/** Header wishlist icon with the number of saved products. The wishlist belongs to the signed-in user and is read from the server, so the count is 0 until it has loaded. */
export function WishlistLink() {
  const { items } = useWishlist();
  const count = items.length;

  return (
    <Link
      href={headerActions.wishlist.href}
      aria-label={
        count > 0
          ? `${headerActions.wishlist.label}, ${count} ${count === 1 ? "item" : "items"}`
          : headerActions.wishlist.label
      }
      className="relative hidden items-center justify-center sm:flex"
    >
      <Heart aria-hidden className="size-4.5" />
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute -top-2 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground"
        >
          {count > MAX_BADGE ? `${MAX_BADGE}+` : count}
        </span>
      ) : null}
    </Link>
  );
}
