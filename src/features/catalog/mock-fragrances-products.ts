import { mockPrices } from "@/features/catalog/mock-helpers";
import type { CatalogProduct } from "@/features/catalog/types";

/**
 * Temporary Fragrances catalog taken from the Figma Haute Parfumerie page.
 * Cards show scent notes instead of sizes and have no color options.
 * Replace with API data.
 */
export const mockFragrancesProducts: CatalogProduct[] = [
  {
    id: "fragrances-1",
    slug: "fragrances-amber-no-01",
    name: "Amber No. 01",
    image: {
      src: "/images/products/fragrances-amber-no-01.jpg",
      alt: "Amber perfume bottle with a bee emblem on a travertine block",
      position: "50% 50%",
    },
    prices: mockPrices(850),
    sizes: ["30 ml", "50 ml", "100 ml"],
    notes: ["Woody", "Amber"],
    badge: { label: "ATELIER SIGNATURE", tone: "dark" },
    subcategory: "woody",
    collection: "unisex",
    availability: "in-stock",
  },
  {
    id: "fragrances-2",
    slug: "fragrances-rose-elixir",
    // Figma spells it "Rose Élixir".
    name: "Rose Élixir",
    image: {
      src: "/images/products/fragrances-rose-elixir.jpg",
      alt: "Blush perfume bottle with a rose-gold cap in soft light",
      position: "50% 50%",
    },
    prices: mockPrices(650),
    sizes: ["25 ml", "50 ml"],
    notes: ["Floral", "Soft"],
    badge: { label: "NEW ARRIVAL", tone: "light" },
    subcategory: "floral",
    collection: "ladies",
    availability: "in-stock",
  },
  {
    id: "fragrances-3",
    slug: "fragrances-oud-noir",
    // The Figma card is mislabeled "Color: Black"; this name is a placeholder to confirm.
    name: "Oud Noir",
    image: {
      src: "/images/products/fragrances-oud-noir.jpg",
      alt: "Black perfume roll-on bottle among terracotta blocks",
      position: "50% 50%",
    },
    prices: mockPrices(540),
    sizes: ["15 ml", "30 ml"],
    notes: ["Oud", "Intense"],
    subcategory: "oud",
    collection: "men",
    availability: "in-stock",
  },
  {
    id: "fragrances-4",
    slug: "fragrances-pure-essence-nur",
    name: "Pure Essence",
    image: {
      src: "/images/products/fragrances-pure-essence-nur.jpg",
      alt: "Nur perfume oil bottle with a gold collar and glass stopper",
      position: "50% 50%",
    },
    prices: mockPrices(1420),
    sizes: ["15 ml", "25 ml"],
    notes: ["Oud", "Intense"],
    badge: { label: "ARCHIVAL ALLOCATION", tone: "dark" },
    subcategory: "oud",
    collection: "unisex",
    availability: "in-stock",
  },
  {
    id: "fragrances-5",
    slug: "fragrances-pure-essence-genyum",
    name: "Pure Essence",
    image: {
      src: "/images/products/fragrances-pure-essence-genyum.jpg",
      alt: "Eau de parfum bottle with a black cap on a stone slab beside linen",
      position: "45% 50%",
    },
    prices: mockPrices(320),
    sizes: ["30 ml", "50 ml"],
    notes: ["Oud", "Intense"],
    badge: { label: "NEW ARRIVAL", tone: "light" },
    subcategory: "oud",
    collection: "room",
    availability: "in-stock",
  },
  {
    id: "fragrances-6",
    slug: "fragrances-pure-essence-rose",
    name: "Pure Essence",
    image: {
      src: "/images/products/fragrances-pure-essence-rose.jpg",
      alt: "Rose-tinted perfume bottle with a gold cap on a white podium",
      position: "50% 50%",
    },
    prices: mockPrices(1850),
    sizes: ["50 ml", "100 ml"],
    notes: ["Oud", "Intense"],
    subcategory: "oud",
    collection: "car",
    availability: "pre-order",
  },
];
