import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { aboutCta } from "@/features/about/about-content";

export function AboutCtaSection() {
  return (
    <Section className="lg:py-25">
      <div className="grid items-center gap-8 rounded-3xl bg-foreground p-6 lg:mx-5 lg:grid-cols-[1fr_44.6%] lg:gap-10 lg:px-10">
        <div className="flex flex-col items-start">
          <h2 className="font-heading text-3xl leading-tight font-semibold text-white lg:text-[41px]">
            {aboutCta.title}
          </h2>
          <p className="mt-3 max-w-[27rem] text-base leading-snug text-muted-foreground">
            {aboutCta.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-4 lg:mt-12">
            <ButtonLink
              href={aboutCta.primary.href}
              variant="secondary"
              className="px-7 py-3.5 text-sm"
            >
              {aboutCta.primary.label}
            </ButtonLink>
            <ButtonLink
              href={aboutCta.secondary.href}
              variant="secondary"
              className="px-6 py-4 text-[11px] tracking-wide uppercase"
            >
              {aboutCta.secondary.label}
            </ButtonLink>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
          <Image
            src={aboutCta.image.src}
            alt={aboutCta.image.alt}
            fill
            sizes="(min-width: 1024px) 517px, 100vw"
            style={{ objectPosition: aboutCta.image.position }}
            className="object-cover"
          />
        </div>
      </div>
    </Section>
  );
}
