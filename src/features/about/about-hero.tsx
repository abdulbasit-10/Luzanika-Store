import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { aboutHero, aboutHeroImage } from "@/features/about/about-content";

/*
 * From lg up the hero fills the visible area below the header, so it fits the
 * screen at any laptop size, Windows scaling or browser zoom. It is capped at
 * 60vw so it does not grow taller than the photo on tall windows. The height
 * is set directly (not aspect-ratio) so the width always stays full.
 * The 38% black overlay turns the photo's light studio wall into the Figma's
 * #8F8E8E (measured), which the dark title needs to stay readable. The photo
 * is anchored near the top and right so heads are not cropped when the hero
 * is short or narrow.
 */
export function AboutHero() {
  return (
    <section className="relative isolate flex min-h-[26rem] w-full items-center overflow-hidden bg-[#8f8e8e] lg:h-[min(60vw,calc(100dvh-var(--header-height)))] lg:min-h-96">
      <Image
        src={aboutHeroImage.src}
        alt={aboutHeroImage.alt}
        fill
        priority
        sizes="100vw"
        style={{ objectPosition: aboutHeroImage.position }}
        className="-z-20 object-cover"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/38" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-r from-white/50 to-transparent lg:hidden"
      />
      <Container className="py-16 lg:py-0">
        <div className="flex flex-col items-start gap-6 lg:w-[48vw] lg:max-w-[690px]">
          <h1 className="font-heading text-4xl leading-normal font-medium sm:text-5xl lg:text-[clamp(2.5rem,4.58vw,4.125rem)]">
            {aboutHero.titleLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="max-w-[600px] text-base leading-relaxed text-foreground">
            {aboutHero.description}
          </p>
          <ButtonLink href={aboutHero.cta.href}>
            {aboutHero.cta.label}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
