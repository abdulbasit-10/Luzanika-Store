import Image from "next/image";

import { cn } from "@/utils/cn";

/*
 * Full-width banner with a centred title. From lg up it fills the visible area
 * below the header, like the home and About heroes, so it fits the screen at
 * any laptop size, Windows scaling or browser zoom. It is capped at 60vw so it
 * does not grow taller than the photo on tall windows. The height is set
 * directly (not aspect-ratio) so the width always stays full. The photo is
 * anchored so heads are not cropped when the banner is short.
 * The 45% black overlay matches the Figma banners (measured on the Men and
 * Ladies frames, and shown on the Contact frame) and keeps the white title
 * readable on any photo.
 */
export const PAGE_BANNER_HEIGHT =
  "h-56 sm:h-72 lg:h-[min(60vw,calc(100dvh-var(--header-height)))] lg:min-h-64";

/* A short strip, a quarter of the visible screen under the header (--banner-short in globals.css). */
const PAGE_BANNER_SHORT_HEIGHT = "h-40 sm:h-48 lg:h-(--banner-short)";

interface PageBannerProps {
  title: string;
  image: { src: string; alt: string; position?: string };
  titleClassName?: string;
  /** Use the short (quarter-screen) height instead of the full-screen collection banner height. */
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
