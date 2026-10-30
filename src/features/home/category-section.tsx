import { CategoryGrid } from "@/components/shared/category-grid";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";

export function CategorySection() {
  return (
    <Section>
      <SectionHeading eyebrow="Explore by category" title="Shop by Category" />
      <CategoryGrid className="mt-8" />
    </Section>
  );
}
