import { CategoryCard } from "@/components/shared/category-card";
import { cn } from "@/utils/cn";

const topRow = [
  {
    title: "Men",
    description: "Tailored Suits & Casual Classics",
    href: "/men",
    image: { src: "/images/categories/men.jpg", alt: "Man in a tailored suit" },
    imagePosition: "50% 0%",
  },
  {
    title: "Ladies",
    description: "Contemporary Silhouettes & Knitwear",
    href: "/ladies",
    image: {
      src: "/images/categories/ladies.jpg",
      alt: "Woman in a neutral knit top",
    },
    imagePosition: "50% 0%",
  },
  {
    title: "Kids",
    description: "Playful Luxury & Everyday Wear",
    href: "/kids",
    image: { src: "/images/categories/kids.jpg", alt: "Girl in a beige coat" },
    imagePosition: "50% 0%",
  },
];

const bottomRow = [
  {
    title: "Bags",
    description: "Handcrafted Italian Leather Goods",
    href: "/bags",
    image: { src: "/images/categories/bags.jpg", alt: "Brown leather handbag" },
    imagePosition: "50% 65%",
  },
  {
    title: "Fragrances",
    description: "Signature Artisanal Scents",
    href: "/fragrances",
    image: {
      src: "/images/categories/fragrances.jpg",
      alt: "Perfume bottle on a gold fabric background",
    },
    imagePosition: "50% 45%",
  },
];

/** The five-category grid (3 + 2) shared by the home and About pages. */
export function CategoryGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6",
        className,
      )}
    >
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
  );
}
