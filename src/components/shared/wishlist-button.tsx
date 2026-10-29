"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

import { cn } from "@/utils/cn";

interface WishlistButtonProps {
  productName: string;
  className?: string;
}

/** Visual toggle only; it will be wired to the wishlist service later. */
export function WishlistButton({
  productName,
  className,
}: WishlistButtonProps) {
  const [active, setActive] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${active ? "Remove" : "Add"} ${productName} ${active ? "from" : "to"} wishlist`}
      onClick={() => setActive((value) => !value)}
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
