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
    image: {
      src: "/images/products/essential-tailored-blazer-black.jpg",
      alt: "Woman in a black tailored blazer and wide-leg trousers",
      position: "50% 0%",
    },
    prices: mockPrices(150),
    rating: 4.8,
    color: { name: "Black", hex: "#111111" },
    isNew: true,
  },
  {
    id: "featured-2",
    slug: "relaxed-linen-shirt",
    name: "Relaxed Linen Shirt",
    image: {
      src: "/images/products/relaxed-linen-shirt.jpg",
      alt: "Woman in an oversized cream linen shirt",
      position: "50% 0%",
    },
    prices: mockPrices(200),
    rating: 4.5,
    color: { name: "Cream", hex: "#efe6d4" },
  },
  {
    id: "featured-3",
    slug: "essential-tailored-blazer-brown",
    name: "Essential Tailored Blazer",
    image: {
      src: "/images/products/essential-tailored-blazer-brown.png",
      alt: "Woman in a white knit top and brown wide-leg trousers",
      position: "50% 0%",
    },
    prices: mockPrices(230),
    rating: 4.8,
    color: { name: "Brown", hex: "#6b4226" },
    isNew: true,
  },
  {
    id: "featured-4",
    slug: "essential-tailored-blazer-olive",
    name: "Essential Tailored Blazer",
    image: {
      src: "/images/products/essential-tailored-blazer-olive.jpg",
      alt: "Back view of a woman in an olive belted trench coat",
      position: "50% 0%",
    },
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
    image: {
      src: "/images/products/everyday-backpack.jpg",
      alt: "Black leather backpack beside a plant",
      position: "50% 50%",
    },
    prices: mockPrices(15),
  },
  {
    id: "new-2",
    slug: "womens-formal-dress",
    name: "Women's Formal Dress",
    image: {
      src: "/images/products/womens-formal-dress.jpg",
      alt: "Woman in a beaded champagne formal dress and hijab",
      position: "50% 0%",
    },
    prices: mockPrices(25),
  },
  {
    id: "new-3",
    slug: "mens-casual-shirt",
    name: "Men's Casual Shirt",
    image: {
      src: "/images/products/mens-casual-shirt.jpg",
      alt: "Man in a beige linen shirt and jeans",
      position: "40% 50%",
    },
    prices: mockPrices(18),
  },
  {
    id: "new-4",
    slug: "unisex-fragrance",
    name: "Unisex Fragrance",
    image: {
      src: "/images/products/unisex-fragrance.jpg",
      alt: "Perfume bottle with a gold cap on a white podium",
      position: "50% 50%",
    },
    prices: mockPrices(50),
  },
];

export const mockSpecialOffers: ProductSummary[] = [
  {
    id: "offer-1",
    slug: "black-jacket-denim",
    name: "Black Jacket Denim",
    image: {
      src: "/images/products/black-jacket-denim.png",
      alt: "Man wearing a black denim jacket over a white turtleneck",
      position: "50% 35%",
    },
    prices: mockPrices(30),
  },
  {
    id: "offer-2",
    slug: "black-shoe-casual",
    name: "Black Shoe Casual",
    image: {
      src: "/images/products/black-shoe-casual.jpg",
      alt: "Black tassel loafers with white soles on a wooden bridge",
      position: "45% 50%",
    },
    prices: mockPrices(45),
  },
  {
    id: "offer-3",
    slug: "woman-trouser-blue-light",
    name: "Woman Trouser Blue light",
    image: {
      src: "/images/products/woman-trouser-blue-light.png",
      alt: "Light blue wide-leg jeans with black lace-up shoes",
      position: "50% 30%",
    },
    prices: mockPrices(25),
  },
  {
    id: "offer-4",
    slug: "bag-casual-office",
    name: "Bag Casual Office",
    image: {
      src: "/images/products/bag-casual-office.png",
      alt: "Black leather briefcase held against an olive coat",
      position: "56% 50%",
    },
    prices: mockPrices(35),
  },
];
