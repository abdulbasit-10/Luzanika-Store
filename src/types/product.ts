import type { RegionalPrice } from "@/types/region";

export interface ProductImage {
  src: string;
  alt: string;
  /** CSS object-position, keeps the subject in frame when the photo is cropped. */
  position?: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

/** Small label on a product photo, e.g. "NEW ARRIVAL". */
export interface ProductBadge {
  label: string;
  tone: "dark" | "light";
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  image?: ProductImage;
  prices: RegionalPrice[];
  rating?: number;
  /** The first color is the one shown as selected. */
  colors?: ProductColor[];
  sizes?: string[];
  isNew?: boolean;
  badge?: ProductBadge;
}
