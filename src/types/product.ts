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

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  image?: ProductImage;
  prices: RegionalPrice[];
  rating?: number;
  color?: ProductColor;
  isNew?: boolean;
}
