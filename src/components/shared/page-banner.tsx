import Image from "next/image";

import { cn } from "@/utils/cn";

/*
 * Full-width banner with a centred title. From lg up, the height follows the
 * 2.4:1 Figma frame (41.67vw) but is capped so at least 8rem of the page
 * stays visible under it: the banner never fills the whole screen, whatever
 * the laptop size, Windows scaling or browser zoom. The photo is anchored so
 * heads are not cropped when the banner is short.
 * The 45% black overlay matches the Figma banners (measured on the Men and
 * Ladies frames, and shown on the Contact frame) and keeps the white title
 * readable on any photo.
 */
export const PAGE_BANNER_HEIGHT =
  "h-56 sm:h-72 lg:h-[min(41.67vw,calc(100dvh-var(--header-height)-8rem))] lg:min-h-64";

/* A short strip, a quarter of the visible screen under the header (--banner-short in globals.css). */
const PAGE_BANNER_SHORT_HEIGHT = "h-40 sm:h-48 lg:h-(--banner-short)";

interface PageBannerProps {
  title: string;
  image: { src: string; alt: string; position?: string };
  titleClassName?: string;
  /** Use the short (quarter-screen) height instead of the collection banner height. */
  short?: boolean;
}

export function PageBanner({
  title,
  image,
  titleClassName,
  short = false,
}: PageBannerProps) {
  return (
    <section
      className={cn(
        "relative isolate flex w-full items-center justify-center overflow-hidden bg-muted",
        short ? PAGE_BANNER_SHORT_HEIGHT : PAGE_BANNER_HEIGHT,
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        priority
        sizes="100vw"
        style={{ objectPosition: image.position }}
        className="-z-20 object-cover"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/45" />
      <h1
        className={cn(
          "px-gutter text-center font-heading text-4xl font-medium text-primary-foreground lg:text-[clamp(2.25rem,3.33vw,3rem)]",
          titleClassName,
        )}
      >
        {title}
      </h1>
    </section>
  );
}
