import Image from "next/image";

import type { CategoryDefinition } from "@/features/catalog/types";

/*
 * Full-width banner with the collection title. From lg up, the height follows
 * the 2.4:1 Figma frame (41.67vw) but is capped so at least 8rem of the page
 * stays visible under it: the banner never fills the whole screen, whatever
 * the laptop size, Windows scaling or browser zoom. The photo is anchored so
 * heads are not cropped when the banner is short.
 * The 45% black overlay matches the Figma banners (measured on the Men and
 * Ladies frames) and keeps the white title readable on any photo.
 */
export const CATALOG_HERO_HEIGHT =
  "h-56 sm:h-72 lg:h-[min(41.67vw,calc(100dvh-var(--header-height)-8rem))] lg:min-h-64";

export function CatalogHero({ category }: { category: CategoryDefinition }) {
  const { heroImage, heroTitle } = category;

  return (
    <section
      className={`relative isolate flex w-full items-center justify-center overflow-hidden bg-muted ${CATALOG_HERO_HEIGHT}`}
    >
      <Image
        src={heroImage.src}
        alt={heroImage.alt}
        fill
        priority
        sizes="100vw"
        style={{ objectPosition: heroImage.position }}
        className="-z-20 object-cover"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/45" />
      <h1 className="px-gutter text-center font-heading text-4xl font-medium text-primary-foreground lg:text-[clamp(2.25rem,3.33vw,3rem)]">
        {heroTitle}
      </h1>
    </section>
  );
}
