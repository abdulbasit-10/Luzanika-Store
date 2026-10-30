import { mockBagsProducts } from "@/features/catalog/mock-bags-products";
import { mockFragrancesProducts } from "@/features/catalog/mock-fragrances-products";
import { mockKidsProducts } from "@/features/catalog/mock-kids-products";
import { mockLadiesProducts } from "@/features/catalog/mock-ladies-products";
import { mockMenProducts } from "@/features/catalog/mock-men-products";
import {
  ALL_SUBCATEGORY,
  type Catalog,
  type CatalogFacets,
  type CategorySlug,
} from "@/features/catalog/types";

/**
 * Mock catalog service. Each function mirrors an API call the Express backend
 * will provide; swap the bodies for `apiGet(...)` and keep the signatures.
 * Only categories with a Figma design are listed.
 */

// Filter options shared by the clothing categories; the backend will return these per category.
const sharedSizes = ["S", "M", "L", "XL", "XXL"];
const sharedAvailability: CatalogFacets["availability"] = [
  { value: "in-stock", label: "In Stock Atelier" },
  { value: "pre-order", label: "Pre-Order Archive" },
  { value: "fitting-ready", label: "Complimentary Fitting Ready" },
];
// The same numbers are used for PKR and EUR for now; the backend will return a range per region.
const sharedPriceRange: CatalogFacets["priceRange"] = {
  min: 500,
  max: 5000,
  step: 50,
};

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
      sizes: sharedSizes,
      availability: sharedAvailability,
      priceRange: sharedPriceRange,
    },
    products: mockMenProducts,
  },
  ladies: {
    category: {
      slug: "ladies",
      label: "Ladies",
      heroTitle: "Ladies Collection",
      title: "Ladies — Collection",
      description:
        "Curated collection of 18 modern essentials designed for ease, fluid silhouettes, and timeless drape across soft, natural textiles.",
      heroImage: {
        src: "/images/categories/ladies-hero.jpg",
        alt: "Three women in black and ivory tailoring against a soft beige wall",
        position: "50% 15%",
      },
      subcategories: [
        { slug: ALL_SUBCATEGORY, label: "ALL LADIES" },
        { slug: "formal", label: "FORMAL WEAR", shortLabel: "Formal" },
        { slug: "sports", label: "SPORTS ACTIVEWEAR", shortLabel: "Sports" },
        { slug: "casual", label: "CASUAL WEAR", shortLabel: "Casual" },
        {
          slug: "knitwear",
          label: "CASHMERE & KNITWEAR",
          shortLabel: "Knitwear",
        },
        { slug: "outerwear", label: "OUTERWEAR", shortLabel: "Outerwear" },
      ],
    },
    facets: {
      collections: [
        { value: "ladies-casual", label: "Ladies Casual" },
        { value: "ladies-formal", label: "Ladies Formal & Suiting" },
        { value: "ladies-sports", label: "Ladies Atelier Sports" },
        { value: "ladies-outerwear", label: "Ladies Outerwear" },
        { value: "ladies-atelier", label: "Ladies Atelier" },
        { value: "haute-leatherware", label: "Haute Leatherware" },
      ],
      sizes: sharedSizes,
      availability: sharedAvailability,
      priceRange: sharedPriceRange,
    },
    products: mockLadiesProducts,
  },
  kids: {
    category: {
      slug: "kids",
      label: "Kids",
      heroTitle: "Kids Collection",
      title: "Kids — Collection",
      description:
        "Curated collection of 18 playful essentials designed for ease, comfortable fits, and timeless charm across soft, durable textiles.",
      heroImage: {
        src: "/images/categories/kids-hero.jpg",
        alt: "Three girls in denim and neutral layers against a teal backdrop",
        position: "50% 15%",
      },
      subcategories: [
        { slug: ALL_SUBCATEGORY, label: "ALL KIDS" },
        { slug: "formal", label: "FORMAL WEAR", shortLabel: "Formal" },
        { slug: "sports", label: "SPORTS ACTIVEWEAR", shortLabel: "Sports" },
        { slug: "casual", label: "CASUAL WEAR", shortLabel: "Casual" },
        {
          slug: "knitwear",
          label: "CASHMERE & KNITWEAR",
          shortLabel: "Knitwear",
        },
        { slug: "outerwear", label: "OUTERWEAR", shortLabel: "Outerwear" },
      ],
    },
    facets: {
      collections: [
        { value: "kids-casual", label: "Kids Casual" },
        { value: "kids-formal", label: "Kids Formal & Suiting" },
        { value: "kids-sports", label: "Kids Atelier Sports" },
        { value: "kids-outerwear", label: "Kids Outerwear" },
        { value: "kids-atelier", label: "Kids Atelier" },
        { value: "haute-leatherware", label: "Haute Leatherware" },
      ],
      sizes: sharedSizes,
      availability: sharedAvailability,
      priceRange: sharedPriceRange,
    },
    products: mockKidsProducts,
  },
  bags: {
    category: {
      slug: "bags",
      label: "Bags",
      heroTitle: "BAGS Collection",
      title: "BAGS & LEATHERGOODS — Collection",
      description:
        "Curated collection of 18 handcrafted essentials designed for everyday ease, enduring structure, and timeless character in fine leather and canvas.",
      heroImage: {
        src: "/images/categories/bags-hero.jpg",
        alt: "Leather tote, backpack, shoulder bag and duffel arranged on stone podiums",
        position: "50% 50%",
      },
      subcategories: [
        { slug: ALL_SUBCATEGORY, label: "ALL BAGS" },
        { slug: "handbags", label: "HANDBAGS", shortLabel: "Handbags" },
        {
          slug: "shoulder",
          label: "SHOULDER BAGS",
          shortLabel: "Shoulder bags",
        },
        { slug: "totes", label: "TOTE BAGS", shortLabel: "Tote bags" },
        { slug: "backpacks", label: "BACKPACKS", shortLabel: "Backpacks" },
        {
          slug: "travel",
          label: "TRAVEL BAGS",
          shortLabel: "Travel bags",
        },
      ],
    },
    facets: {
      collections: [
        { value: "bag-casual", label: "Bag Casual" },
        { value: "bag-formal", label: "Bag Formal & Suiting" },
        { value: "handbags", label: "Handbags" },
        { value: "backpacks", label: "Backpacks" },
        { value: "travel-bags", label: "Travel Bags" },
      ],
      sizes: sharedSizes,
      availability: sharedAvailability,
      priceRange: sharedPriceRange,
    },
    products: mockBagsProducts,
  },
  fragrances: {
    category: {
      slug: "fragrances",
      label: "Fragrances",
      heroTitle: "HAUTE PARFUMERIE Collection",
      title: "HAUTE PARFUMERIE — Collection",
      description:
        "Curated collection of 18 artisanal scents designed for presence, lasting depth, and timeless character across rare, natural ingredients.",
      heroImage: {
        src: "/images/categories/fragrances-hero.jpg",
        alt: "Four perfume bottles on stone podiums with white flowers and driftwood",
        position: "50% 50%",
      },
      subcategories: [
        { slug: ALL_SUBCATEGORY, label: "ALL FRAGRANCES" },
        {
          slug: "woody",
          label: "WOODY & AMBER",
          shortLabel: "Woody & Amber",
        },
        { slug: "floral", label: "FLORAL & SOFT", shortLabel: "Floral" },
        { slug: "oud", label: "OUD & INTENSE", shortLabel: "Oud" },
        { slug: "fresh", label: "FRESH & CITRUS", shortLabel: "Fresh" },
        { slug: "gifts", label: "GIFT SETS", shortLabel: "Gift sets" },
      ],
    },
    facets: {
      collections: [
        { value: "men", label: "Men" },
        { value: "ladies", label: "Ladies" },
        { value: "unisex", label: "Unisex" },
        { value: "room", label: "Room" },
        { value: "car", label: "Car" },
      ],
      sizes: ["15 ml", "25 ml", "30 ml", "50 ml", "100 ml"],
      availability: sharedAvailability,
      priceRange: sharedPriceRange,
    },
    products: mockFragrancesProducts,
  },
};

export function listCategorySlugs(): CategorySlug[] {
  return Object.keys(catalogs) as CategorySlug[];
}

export function getCatalog(slug: string): Catalog | undefined {
  return catalogs[slug as CategorySlug];
}
