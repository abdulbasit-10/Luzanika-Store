"use client";

import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import type { ProductImage } from "@/types/product";
import { cn } from "@/utils/cn";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  isNew?: boolean;
}

/*
 * From lg up, the column width is derived from the visible height: width =
 * 0.652 x (viewport height - header - 3rem). That makes the 3:4 photo plus a
 * strip of five square thumbnails exactly fill the screen under the header,
 * at any laptop size, Windows scaling or browser zoom. It is capped at 40rem
 * so the info column keeps enough room on large monitors, and floored at 15rem.
 */
const columnWidth =
  "lg:w-[max(15rem,min(40rem,44vw,calc((100dvh-var(--header-height)-3rem)*0.652)))]";

/** Large photo with a thumbnail strip. The first image is shown by default. */
export function ProductGallery({
  images,
  productName,
  isNew,
}: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-md flex-col gap-2 lg:mx-0 lg:max-w-none",
        columnWidth,
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {current ? (
          <Image
            key={current.src}
            src={current.src}
            alt={current.alt}
            fill
            priority={active === 0}
            sizes="(min-width: 1024px) 40rem, 100vw"
            style={{ objectPosition: current.position }}
            className="object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon aria-hidden className="size-10" />
            <span className="sr-only">No photo of {productName}</span>
          </span>
        )}
        {isNew ? (
          <span className="absolute top-4 left-4 bg-surface px-4 py-2.5 text-[11px] leading-4 font-bold text-foreground uppercase italic">
            New
          </span>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul
          aria-label="Product photos"
          className="grid auto-cols-fr grid-flow-col gap-2"
        >
          {images.map((image, index) => (
            <li key={image.src}>
              <button
                type="button"
                aria-label={`Show photo ${index + 1} of ${images.length}`}
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden bg-muted ring-1 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  index === active
                    ? "ring-primary"
                    : "ring-transparent hover:ring-foreground/40",
                )}
              >
                <Image
                  src={image.src}
                  alt=""
                  fill
                  // Above the fold and tiny. Also stops Next's dev LCP check from flagging the first thumbnail, which shares the main photo's URL.
                  loading="eager"
                  sizes="(min-width: 1024px) 8vw, 16vw"
                  style={{ objectPosition: image.position }}
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
