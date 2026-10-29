import type { ProductSummary } from "@/types/product";
import type { RegionalPrice } from "@/types/region";

/**
 * Temporary data taken from the Figma home page. Replace with API data once
 * the backend exists. Amounts are the Figma values in both regional currencies.
 */
function mockPrices(amount: number): RegionalPrice[] {
  return [
    { region: "PK", currency: "PKR", amount },
    { region: "DE", currency: "EUR", amount },
  ];
}

export const mockFeaturedProducts: ProductSummary[] = [
  {
    id: "featured-1",
    slug: "essential-tailored-blazer-black",
    name: "Essential Tailored Blazer",
    prices: mockPrices(150),
    rating: 4.8,
    color: { name: "Black", hex: "#111111" },
    isNew: true,
  },
  {
    id: "featured-2",
    slug: "relaxed-linen-shirt",
    name: "Relaxed Linen Shirt",
    prices: mockPrices(200),
    rating: 4.5,
    color: { name: "Cream", hex: "#efe6d4" },
  },
  {
    id: "featured-3",
    slug: "essential-tailored-blazer-brown",
    name: "Essential Tailored Blazer",
    prices: mockPrices(230),
    rating: 4.8,
    color: { name: "Brown", hex: "#6b4226" },
    isNew: true,
  },
  {
    id: "featured-4",
    slug: "essential-tailored-blazer-olive",
    name: "Essential Tailored Blazer",
    prices: mockPrices(280),
    rating: 4.8,
    color: { name: "Olive", hex: "#6b6b3a" },
  },
];

export const mockNewArrivals: ProductSummary[] = [
  {
    id: "new-1",
    slug: "everyday-backpack",
    name: "Everyday Backpack",
    prices: mockPrices(15),
  },
  {
    id: "new-2",
    slug: "womens-formal-dress",
    name: "Women's Formal Dress",
    prices: mockPrices(25),
  },
  {
    id: "new-3",
    slug: "mens-casual-shirt",
    name: "Men's Casual Shirt",
    prices: mockPrices(18),
  },
  {
    id: "new-4",
    slug: "unisex-fragrance",
    name: "Unisex Fragrance",
    prices: mockPrices(50),
  },
];

export const mockSpecialOffers: ProductSummary[] = [
  {
    id: "offer-1",
    slug: "black-jacket-denim",
    name: "Black Jacket Denim",
    prices: mockPrices(30),
  },
  {
    id: "offer-2",
    slug: "black-shoe-casual",
    name: "Black Shoe Casual",
    prices: mockPrices(45),
  },
  {
    id: "offer-3",
    slug: "woman-trouser-blue-light",
    name: "Woman Trouser Blue light",
    prices: mockPrices(25),
  },
  {
    id: "offer-4",
    slug: "bag-casual-office",
    name: "Bag Casual Office",
    prices: mockPrices(35),
  },
];
