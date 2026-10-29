import type { RegionalPrice } from "@/types/region";

export interface ProductImage {
  src: string;
  alt: string;
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
