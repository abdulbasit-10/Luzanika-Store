import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { aboutPillars } from "@/features/about/about-content";

export function GuidingPillarsSection() {
  return (
    <Section className="lg:py-25">
      <SectionHeading
        eyebrow={aboutPillars.eyebrow}
        title={aboutPillars.title}
        titleClassName="max-w-none text-3xl text-navy lg:text-[50px]"
        contentClassName="lg:gap-8.5"
      />
      <ul className="mt-8 grid gap-6 md:grid-cols-3 lg:mt-15">
        {aboutPillars.items.map(({ title, description, icon: Icon }) => (
          <li
            key={title}
            className="flex flex-col items-center rounded-xl bg-white px-8 pt-8 pb-6 text-center lg:pt-11 lg:pb-5"
          >
            <span
              aria-hidden
              className="flex size-[72px] items-center justify-center rounded-full bg-foreground text-white"
            >
              <Icon className="size-8" strokeWidth={1.5} />
            </span>
            <h3 className="mt-6 font-heading text-2xl font-medium text-navy lg:mt-17 lg:text-[27px] lg:leading-9">
              {title}
            </h3>
            <p className="mt-2 text-base leading-8 text-copy lg:text-[17px] lg:leading-[2.3]">
              {description}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
