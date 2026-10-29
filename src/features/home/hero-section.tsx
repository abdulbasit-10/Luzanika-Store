import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function HeroSection() {
  return (
    <section className="relative isolate min-h-[28rem] overflow-hidden bg-section lg:min-h-[40rem] xl:aspect-[2/1] xl:min-h-0">
      <Image
        src="/images/hero.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[70%_center]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-r from-white/75 via-white/35 to-transparent lg:hidden"
      />
      <Container className="flex min-h-[inherit] items-center py-16 xl:h-full xl:py-0">
        <div className="flex max-w-[690px] flex-col items-start gap-6">
          <h1 className="font-heading text-4xl leading-normal font-semibold sm:text-5xl xl:text-[66px]">
            Discover the Latest Trends in Fashion Ecommerce
          </h1>
          <p className="max-w-[648px] font-medium text-muted-foreground">
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
