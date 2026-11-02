import type { CategorySlug } from "@/features/catalog/types";

export type SizeGuideAudience = Extract<
  CategorySlug,
  "men" | "ladies" | "kids"
>;

export interface SizeGuideImage {
  src: string;
  alt: string;
}

export interface SizeGuideRow {
  size: string;
  /** Length, chest, waist and hips, in centimetres. */
  measurements: [number, number, number, number];
}

export interface SizeGuide {
  image: SizeGuideImage;
  rows: SizeGuideRow[];
}

export const sizeGuideColumns = ["Length", "Chest", "Waist", "Hips"] as const;

// The numbers are the Figma placeholders; replace them with the client's real
// size chart (the backend will serve this shape per product).
const adultRows: SizeGuideRow[] = [
  { size: "XS", measurements: [114.5, 105, 105, 195] },
  { size: "S", measurements: [115, 110, 110, 200] },
  { size: "M", measurements: [115.5, 115, 125, 205] },
  { size: "L", measurements: [116, 120, 120, 210] },
  { size: "XL", measurements: [116.5, 125, 125, 215] },
  { size: "XXL", measurements: [117, 130, 130, 220] },
];

const kidsRows: SizeGuideRow[] = [
  { size: "2-3 Years", measurements: [114.5, 105, 105, 195] },
  { size: "4-5 Years", measurements: [115, 110, 110, 200] },
  { size: "6-7 Years", measurements: [115.5, 115, 115, 205] },
  { size: "8-9 Years", measurements: [116, 120, 120, 210] },
  { size: "10-11 Years", measurements: [116.5, 125, 125, 215] },
  { size: "12-13 Years", measurements: [117, 130, 130, 220] },
];

const sizeGuides: Record<SizeGuideAudience, SizeGuide> = {
  men: {
    image: {
      src: "/images/size-guide/men.jpg",
      alt: "A tape measure running along a man's arm and shoulder",
    },
    rows: adultRows,
  },
  ladies: {
    image: {
      src: "/images/size-guide/ladies.jpg",
      alt: "A tape measure around a woman's waist",
    },
    rows: adultRows,
  },
  kids: {
    image: {
      src: "/images/size-guide/kids.jpg",
      alt: "A girl standing against a height chart",
    },
    rows: kidsRows,
  },
};

export function getSizeGuide(category?: string): SizeGuide | undefined {
  return category && category in sizeGuides
    ? sizeGuides[category as SizeGuideAudience]
    : undefined;
}
