import { Star } from "lucide-react";

import { cn } from "@/utils/cn";

interface RatingStarsProps {
  /** Rating out of 5, rounded to whole stars. */
  rating: number;
  reviewCount?: number;
  className?: string;
}

export function RatingStars({
  rating,
  reviewCount,
  className,
}: RatingStarsProps) {
  const filled = Math.min(5, Math.max(0, Math.round(rating)));

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <span
        role="img"
        aria-label={`Rated ${rating} out of 5`}
        className="flex gap-0.5"
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            aria-hidden
            className={cn(
              "size-3.5",
              index < filled
                ? "fill-orange-500 text-orange-500"
                : "fill-transparent text-muted-foreground/50",
            )}
          />
        ))}
      </span>
      {reviewCount !== undefined ? (
        <span className="text-muted-foreground">{reviewCount} Reviews</span>
      ) : null}
    </div>
  );
}
