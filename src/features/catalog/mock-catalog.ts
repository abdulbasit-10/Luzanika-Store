import { mockMenProducts } from "@/features/catalog/mock-men-products";
import {
  ALL_SUBCATEGORY,
  type Catalog,
  type CategorySlug,
} from "@/features/catalog/types";

/**
 * Mock catalog service. Each function mirrors an API call the Express backend
 * will provide; swap the bodies for `apiGet(...)` and keep the signatures.
 * Only categories with a Figma design are listed.
 */
const catalogs: Partial<Record<CategorySlug, Catalog>> = {
  men: {
    category: {
      slug: "men",
      label: "Men",
      heroTitle: "Men Collection",
      title: "Men — Collection",
      description:
        "Curated collection of 18 archival essentials designed for ease, architectural form, and timeless drape across unbleached raw textiles.",
      heroImage: {
        src: "/images/categories/men-hero.jpg",
        alt: "Six men in relaxed neutral tailoring in a sunlit marble hall",
        position: "50% 25%",
      },
      subcategories: [
        { slug: ALL_SUBCATEGORY, label: "ALL MEN" },
        { slug: "formal", label: "FORMAL TAILORING", shortLabel: "Formal" },
        { slug: "sports", label: "SPORTS ACTIVEWEAR", shortLabel: "Sports" },
        { slug: "casual", label: "CASUAL WEAR", shortLabel: "Casual" },
        {
          slug: "knitwear",
          label: "CASHMERE & KNITWEAR",
          shortLabel: "Knitwear",
        },
        { slug: "overcoats", label: "OVERCOATS", shortLabel: "Overcoats" },
      ],
    },
    facets: {
      collections: [
        { value: "men-casual", label: "Men Casual" },
        { value: "men-formal", label: "Men Formal & Suiting" },
        { value: "men-sports", label: "Men Atelier Sports" },
        { value: "men-outerwear", label: "Men Outerwear" },
        { value: "ladies-atelier", label: "Ladies Atelier" },
        { value: "haute-leatherware", label: "Haute Leatherware" },
      ],
      sizes: ["S", "M", "L", "XL", "XXL"],
      availability: [
        { value: "in-stock", label: "In Stock Atelier" },
        { value: "pre-order", label: "Pre-Order Archive" },
        { value: "fitting-ready", label: "Complimentary Fitting Ready" },
      ],
      // Backend will return this per region; the same numbers are used for PKR and EUR for now.
      priceRange: { min: 500, max: 5000, step: 50 },
    },
    products: mockMenProducts,
  },
};

export function listCategorySlugs(): CategorySlug[] {
  return Object.keys(catalogs) as CategorySlug[];
}

export function getCatalog(slug: string): Catalog | undefined {
  return catalogs[slug as CategorySlug];
}
