"use client";

import { CircleHelp, Heart, Share2 } from "lucide-react";
import Link from "next/link";

import { toast } from "@/components/ui/toaster";
import { useWishlist } from "@/features/wishlist/use-wishlist";
import type { WishlistProduct } from "@/stores/wishlist-store";
import { cn } from "@/utils/cn";

const actionClass =
  "flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

export function ProductActions({ product }: { product: WishlistProduct }) {
  const { has, toggle } = useWishlist();
  const wishlisted = has(product.id);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch {
        // The visitor dismissed the share sheet.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard", { id: "share-link" });
    } catch {
      toast.error(
        "Couldn't copy the link. Please copy it from the address bar.",
        {
          id: "share-link",
        },
      );
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
      <button
        type="button"
        aria-pressed={wishlisted}
        onClick={() => toggle(product)}
        className={actionClass}
      >
        <Heart
          aria-hidden
          className={cn("size-4", wishlisted && "fill-red-500 text-red-500")}
        />
        Wishlist
      </button>
      <Link href="/contact" className={actionClass}>
        <CircleHelp aria-hidden className="size-4" />
        Ask question
      </Link>
      <button type="button" onClick={share} className={actionClass}>
        <Share2 aria-hidden className="size-4" />
        Share
      </button>
    </div>
  );
}
