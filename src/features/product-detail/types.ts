import type { CategorySlug } from "@/features/catalog/types";
import type { ProductColor, ProductImage } from "@/types/product";
import type { RegionalPrice } from "@/types/region";

export interface ProductDetailSection {
  title: string;
  body: string;
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
  /** Live "people are looking at this product" count. */
  viewersNow?: number;
  isNew?: boolean;
  colors?: ProductColor[];
  sizes?: string[];
  hasSizeGuide?: boolean;
  stock: number;
  /** Cards under "Details", e.g. Description and Material. */
  details?: ProductDetailSection[];
  category?: { slug: CategorySlug; label: string };
  /** Second breadcrumb level, e.g. "Casual". */
  subcategoryLabel?: string;
}
