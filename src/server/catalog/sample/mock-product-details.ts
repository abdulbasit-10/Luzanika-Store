import { mockPrices } from "@/server/catalog/sample/mock-helpers";
import type { SampleProductDetail } from "@/server/catalog/sample/types";
import type { ProductColor, ProductImage } from "@/types/product";

/**
 * Temporary data for the five product pages designed in Figma. Every other
 * product gets a page generated from its listing data (see product-service).
 * Replace with API data. Copy marked "placeholder" was too small to read in
 * the Figma screenshots and must be confirmed.
 */

const swatches: ProductColor[] = [
  { name: "Green", hex: "#20c997" },
  { name: "Purple", hex: "#af83f8" },
  { name: "Red", hex: "#e25563" },
  { name: "Black", hex: "#121212" },
];

const clothingSizes = ["S", "M", "L", "XL", "2XL"];

function gallery(
  slug: string,
  files: string[],
  alts: string[],
): ProductImage[] {
  return files.map((file, index) => ({
    src: `/images/products/${slug}-${file}.jpg`,
    alt: alts[index],
    position: "50% 20%",
  }));
}

const common = {
  prices: mockPrices(890),
  rating: 5,
  reviewCount: 23,
  viewersNow: 32,
  isNew: true,
  stock: 673,
};

export const detailedProducts: SampleProductDetail[] = [
  {
    ...common,
    id: "pd-men-1",
    slug: "archival-cashmere-overshirt",
    name: "Archival Cashmere Overshirt",
    tagline: "A refined cashmere overshirt for everyday layering.",
    images: gallery(
      "archival-cashmere-overshirt",
      ["front", "torso", "back", "back-neck", "pocket"],
      [
        "Man in a navy cashmere overshirt over a light blue shirt, front view",
        "Close view of the navy overshirt with a hand in the pocket",
        "Back view of the navy overshirt",
        "Close view of the overshirt collar and back neck",
        "Close view of the button front and chest pocket",
      ],
    ),
    colors: swatches,
    sizes: clothingSizes,
    hasSizeGuide: true,
    details: [
      {
        title: "Description",
        body: "A refined essential for modern wardrobes, this archival cashmere overshirt combines timeless style with everyday versatility. Designed with a classic collar, button-front closure, and practical front pockets, it layers effortlessly over shirts and lightweight knitwear.",
      },
      {
        title: "Material",
        body: "Made with a soft cashmere fabric for a luxurious feel and an elegant finish. The deep charcoal color and minimalist design make it a versatile piece for both smart-casual and everyday outfits. Follow the garment's care label for cleaning and maintenance instructions.",
      },
    ],
    category: { slug: "men", label: "Men" },
    subcategoryLabel: "Casual",
  },
  {
    ...common,
    id: "pd-ladies-1",
    slug: "elegant-satin-midi-dress",
    name: "Elegant Satin Midi Dress",
    tagline: "A timeless silhouette designed for elegant occasions.",
    images: gallery(
      "elegant-satin-midi-dress",
      ["1", "2", "3", "4", "5"],
      [
        "Woman in a champagne satin midi dress with a high neck, full length",
        "Woman seated in a white satin dress",
        "Back view of a satin dress with a bow at the waist",
        "Woman in a satin dress looking to the side",
        "Back view of a cream belted dress",
      ],
    ),
    colors: swatches,
    sizes: clothingSizes,
    hasSizeGuide: true,
    details: [
      {
        title: "Description",
        body: "Designed for effortless elegance, the Elegant Satin Midi Dress brings a refined touch to your wardrobe. Featuring a graceful silhouette with a smooth, lustrous finish, this piece is ideal for formal gatherings, evening events, and special occasions.",
      },
      {
        title: "Material",
        body: "Crafted for an elegant look and comfortable wear, this dress features a smooth satin fabric with a fluid drape. Easy to style for formal events and special occasions. Follow the garment's care label for washing, drying, and storing to help maintain its shape.",
      },
    ],
    category: { slug: "ladies", label: "Ladies" },
    subcategoryLabel: "Formal",
  },
  {
    ...common,
    id: "pd-kids-1",
    slug: "everyday-cotton-co-ord-set",
    name: "Everyday Cotton Co-ord Set",
    tagline: "Comfortable everyday style for little adventures.",
    images: gallery(
      "everyday-cotton-co-ord-set",
      ["1", "2", "3", "4", "5"],
      [
        "Boy in a grey jacket, white tee and navy trousers on a grey background",
        "Flat lay of a grey jacket, white tee and navy trousers",
        "Boy in the co-ord set pointing at the camera",
        "Back view of the boy in the grey jacket and navy trousers",
        "Boy in a burgundy patterned jacket and navy trousers",
      ],
    ),
    colors: swatches,
    sizes: ["2-3Y", "3-4Y", "4-5Y", "5-6Y", "6-7Y"],
    hasSizeGuide: true,
    details: [
      {
        title: "Description",
        body: "Made for everyday adventures, the Everyday Cotton Co-ord Set features a casual-style layered look with a soft, comfortable fit. Easy to wear and easy to style, this set suits playtime, family outings, and casual days out.",
      },
      {
        title: "Material",
        body: "Designed with everyday comfort in mind, this co-ord set features a relaxed silhouette that allows easy movement. Made from soft cotton blend fabrics suitable for everyday wear. Follow the care label for washing and drying.",
      },
    ],
    category: { slug: "kids", label: "Kids" },
    subcategoryLabel: "Formal",
  },
  {
    ...common,
    id: "pd-bags-1",
    slug: "classic-leather-tote-bag",
    name: "Classic Leather Tote Bag",
    tagline: "A timeless everyday essential with a refined, minimalist design.",
    images: gallery(
      "classic-leather-tote-bag",
      ["1", "2", "3", "4", "5"],
      [
        "Tan leather tote bag with brass buckle straps, front view",
        "Tan leather tote bag, three-quarter view",
        "Tan leather tote bag, back view with a zip pocket",
        "Inside of the tote bag showing the lined interior",
        "Close view of the tote bag interior pockets",
      ],
    ),
    colors: swatches,
    details: [
      {
        title: "Description",
        body: "Designed for effortless everyday style, the Classic Leather Tote Bag combines a clean silhouette with practical functionality. Its spacious interior provides room for daily essentials, while the structured shape creates a polished look for work, shopping, and everyday outings.",
      },
      {
        title: "Material",
        body: "Designed with a refined finish and a timeless shape, this tote bag offers a versatile addition to your everyday accessories. Its minimalist design makes it easy to coordinate with a variety of outfits. To maintain its appearance, keep the bag dry and avoid prolonged exposure to direct sunlight.",
      },
    ],
    category: { slug: "bags", label: "Bags" },
    subcategoryLabel: "Handbags",
  },
  {
    ...common,
    id: "pd-fragrances-1",
    slug: "amber-oud-eau-de-parfum",
    name: "Amber Oud Eau de Parfum",
    // The Figma text repeats the tote bag copy ("Classic Leather Tote Bag ..."); this is a placeholder to confirm.
    tagline:
      "A warm, resinous eau de parfum with deep amber and smoky oud, made to be noticed and remembered.",
    images: gallery(
      "amber-oud-eau-de-parfum",
      ["1", "2", "3", "4", "5"],
      [
        "Amber Oud eau de parfum bottle with a black cap beside dried flowers and smoke",
        "Hand holding an Amber Oud perfume bottle",
        "Perfume bottle with a wooden cap resting on gold foil",
        "Amber Oud perfume bottle in front of a golden desert backdrop",
        "Perfume bottle on a stone slab with dried petals",
      ],
    ),
    sizes: ["30 ml", "50 ml", "100 ml"],
    details: [
      {
        title: "Description",
        body: "Amber Oud opens warm and resinous, settling into a deep, smoky heart of oud. A confident unisex scent made for evenings and special occasions, with lasting depth that lingers on skin and fabric.",
      },
      {
        title: "Fragrance Notes",
        body: "Top: bergamot and saffron. Heart: oud and rose. Base: amber, sandalwood and musk. Store in a cool, dry place away from direct sunlight to preserve the scent.",
      },
    ],
    category: { slug: "fragrances", label: "Fragrances" },
    subcategoryLabel: "Unisex",
  },
];
