import { CategoryCard } from "@/components/shared/category-card";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";

const topRow = [
  {
    title: "Men",
    description: "Tailored Suits & Casual Classics",
    href: "/men",
    image: { src: "/images/categories/men.jpg", alt: "Man in a tailored suit" },
  },
  {
    title: "Ladies",
    description: "Contemporary Silhouettes & Knitwear",
    href: "/ladies",
    image: {
      src: "/images/categories/ladies.jpg",
      alt: "Woman in a neutral knit top",
    },
  },
  {
    title: "Kids",
    description: "Playful Luxury & Everyday Wear",
    href: "/kids",
    image: { src: "/images/categories/kids.jpg", alt: "Girl in a beige coat" },
  },
];

const bottomRow = [
  {
    title: "Bags",
    description: "Handcrafted Italian Leather Goods",
    href: "/bags",
    image: { src: "/images/categories/bags.jpg", alt: "Brown leather handbag" },
  },
  {
    title: "Fragrances",
    description: "Signature Artisanal Scents",
    href: "/fragrances",
    image: {
      src: "/images/categories/fragrances.jpg",
      alt: "Perfume bottle on a gold fabric background",
    },
  },
];

export function CategorySection() {
  return (
    <Section>
      <SectionHeading eyebrow="Explore by category" title="Shop by Category" />
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6">
        {topRow.map((category) => (
          <CategoryCard
            key={category.href}
            {...category}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="aspect-[17/20] lg:col-span-2"
          />
        ))}
        {bottomRow.map((category) => (
          <CategoryCard
            key={category.href}
            {...category}
            sizes="(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
            className="aspect-[4/3] lg:col-span-3"
          />
        ))}
      </div>
    </Section>
  );
}
