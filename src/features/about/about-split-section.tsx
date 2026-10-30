import Image from "next/image";

import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/utils/cn";

interface AboutSplitSectionProps {
  tone?: "default" | "cream";
  eyebrow: string;
  title: string;
  description: string;
  image: { src: string; alt: string; position?: string };
  /** Puts the photo on the left from lg up. */
  imageFirst?: boolean;
}

/* Text and photo side by side (Figma: 615x440 photo, 90px inset at 1440). */
export function AboutSplitSection({
  tone = "default",
  eyebrow,
  title,
  description,
  image,
  imageFirst = false,
}: AboutSplitSectionProps) {
  return (
    <Section tone={tone} className="lg:py-25">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:px-2.5">
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            titleClassName="text-4xl text-navy lg:text-5xl"
            contentClassName="lg:gap-8.5"
          />
          <p className="max-w-[40rem] text-base leading-[1.67] text-copy lg:text-lg">
            {description}
          </p>
        </div>
        <div
          className={cn(
            "relative aspect-[4/3] overflow-hidden rounded-xl bg-muted lg:aspect-[615/440]",
            imageFirst && "lg:order-first",
          )}
        >
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 615px, 100vw"
            style={{ objectPosition: image.position }}
            className="object-cover"
          />
        </div>
      </div>
    </Section>
  );
}
