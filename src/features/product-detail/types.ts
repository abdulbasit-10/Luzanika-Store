import type { CategorySlug } from "@/features/catalog/types";
import type { ProductColor, ProductImage } from "@/types/product";
import type { RegionalPrice, RegionCode } from "@/types/region";

export interface ProductDetailSection {
  title: string;
  body: string;
}

/** One sellable combination of colour and size, with its stock in each market. */
export interface ProductVariant {
  id: string;
  /** Colour name, matching an entry of `colors`. */
  color?: string;
  size?: string;
  /** Units available to buy in each market. */
  stock: Record<RegionCode, number>;
}

/** Everything the product page needs. The backend will return this shape for one product. */
export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  /** One-line summary shown under the title. */
  tagline?: string;
  /** Short descriptors such as scent notes ("Woody", "Amber"); the cart shows them under the name. */
  notes?: string[];
  /** The first image is shown by default. */
  images: ProductImage[];
  prices: RegionalPrice[];
  rating?: number;
  reviewCount?: number;
  isNew?: boolean;
  colors?: ProductColor[];
  sizes?: string[];
  hasSizeGuide?: boolean;
  /** Every colour/size combination; the shopper's choice picks one of these. */
  variants: ProductVariant[];
  /** Cards under "Details", e.g. Description and Material. */
  details?: ProductDetailSection[];
  category?: { slug: CategorySlug; label: string };
  /** Second breadcrumb level, e.g. "Casual". */
  subcategoryLabel?: string;
}
