import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/*
 * From lg up the hero fills the visible area below the header (so it fits the
 * screen at any Windows scaling or browser zoom), capped at 60vw so it does not
 * get taller than the photo on tall windows. Height is set directly (not
 * aspect-ratio) so the width always stays full. The photo is anchored near the
 * top so a short hero crops the floor, never the man's head. Text scales with
 * the width like the 1440px frame (66px at 1440 = 4.58vw).
 */
export function HeroSection() {
  return (
    <section className="relative isolate min-h-[28rem] w-full overflow-hidden bg-section lg:h-[min(60vw,calc(100dvh-var(--header-height)))] lg:min-h-[24rem]">
      <Image
        src="/images/hero.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[70%_8%]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-r from-white/75 via-white/35 to-transparent lg:hidden"
      />
      <Container className="flex min-h-[inherit] items-center py-16 lg:h-full lg:py-0">
        <div className="flex flex-col items-start gap-6 lg:w-[48vw] lg:max-w-[690px]">
          <h1 className="font-heading text-4xl leading-normal font-semibold sm:text-5xl lg:text-[clamp(2.5rem,4.58vw,4.125rem)]">
            Discover the Latest Trends in Fashion
          </h1>
          <p className="max-w-[648px] font-medium text-muted-foreground lg:text-[clamp(0.875rem,1.1vw,1rem)]">
            Discover the latest trends and redefine your style with our online
            fashion boutique. Embrace fashion&apos;s ever-changing landscape and
            embark on a journey of self-expression through clothing that
            empowers and inspires.
          </p>
          <ButtonLink href="/products">Shop now</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
