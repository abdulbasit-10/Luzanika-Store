import Image from "next/image";

import type { CategoryDefinition } from "@/features/catalog/types";

/*
 * Full-width banner with the collection title. Height follows the 2.4:1 Figma
 * frame but never exceeds the visible area under the header, so it fits
 * short laptop viewports; the photo is anchored so heads are not cropped.
 */
export function CatalogHero({ category }: { category: CategoryDefinition }) {
  const { heroImage, heroTitle } = category;

  return (
    <section className="relative isolate flex h-56 w-full items-center justify-center overflow-hidden bg-muted sm:h-72 lg:h-[min(41.67vw,calc(100dvh-var(--header-height)))] lg:min-h-64">
      <Image
        src={heroImage.src}
        alt={heroImage.alt}
        fill
        priority
        sizes="100vw"
        style={{ objectPosition: heroImage.position }}
        className="-z-20 object-cover"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/25" />
      <h1 className="px-gutter text-center font-heading text-4xl font-medium text-primary-foreground lg:text-[clamp(2.25rem,3.33vw,3rem)]">
        {heroTitle}
      </h1>
    </section>
  );
}
