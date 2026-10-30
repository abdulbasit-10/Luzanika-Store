import { CategoryGrid } from "@/components/shared/category-grid";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { aboutPortfolio } from "@/features/about/about-content";

export function AboutPortfolioSection() {
  return (
    <Section tone="cream" className="lg:py-25">
      <SectionHeading
        eyebrow={aboutPortfolio.eyebrow}
        title={aboutPortfolio.title}
        titleClassName="max-w-none text-3xl text-black lg:text-[58px]"
      />
      <CategoryGrid className="mt-8 lg:mt-10 lg:gap-y-10" />
    </Section>
  );
}
