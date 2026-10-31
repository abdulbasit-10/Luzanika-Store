"use client";

import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductPrice } from "@/components/shared/product-price";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useWishlist } from "@/features/wishlist/use-wishlist";
import type { WishlistItem } from "@/stores/wishlist-store";

function WishlistCard({
  item,
  onRemove,
}: {
  item: WishlistItem;
  onRemove: () => void;
}) {
  const href = `/products/${item.slug}`;

  return (
    <li className="relative flex flex-col gap-2.5">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className="relative block aspect-[12/13] overflow-hidden rounded-2xl bg-white"
      >
        {item.image ? (
          <Image
            src={item.image.src}
            alt=""
            fill
            sizes="(min-width: 640px) 280px, 50vw"
            style={{ objectPosition: item.image.position }}
            className="object-cover"
          />
        ) : null}
      </Link>

      <button
        type="button"
        aria-label={`Remove ${item.name} from wishlist`}
        onClick={onRemove}
        className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-white shadow-card transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Heart aria-hidden className="size-4 fill-red-500 text-red-500" />
      </button>

      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xs leading-4 text-muted-foreground sm:text-[13px]">
          <Link href={href} className="line-clamp-2 hover:underline">
            {item.name}
          </Link>
        </h2>
        <ProductPrice
          prices={item.prices}
          className="shrink-0 text-base leading-6 font-bold sm:text-lg"
        />
      </div>
    </li>
  );
}

/** The signed-in user's saved products. The heart on a card removes it (with Undo). */
export function WishlistView() {
  const { items, toggle } = useWishlist();

  return (
    <div className="mx-auto w-full max-w-[980px] lg:mx-0">
      <h1 className="text-lg font-semibold sm:text-xl">List Wishlist</h1>

      {items.length === 0 ? (
        <EmptyState
          className="mt-6 rounded-2xl bg-white"
          title="Your wishlist is empty"
          description="Tap the heart on a product to save it here for later."
          action={<ButtonLink href="/products">Browse products</ButtonLink>}
        />
      ) : (
        <ul className="mt-[clamp(1rem,3dvh,1.75rem)] grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(14rem,17.5rem))] sm:gap-x-[clamp(1.5rem,3.4vw,3rem)] sm:gap-y-8">
          {items.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onRemove={() => toggle(item)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
