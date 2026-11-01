import type { CategorySlug } from "@/features/catalog/types";
import type { ProductColor, ProductImage } from "@/types/product";
import type { RegionalPrice } from "@/types/region";

/**
 * The product page shape of the original sample data. Only the one-time
 * import and the tests read it; the website gets a ProductDetail from the
 * database (see features/product-detail/types).
 */
export interface SampleProductDetail {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  notes?: string[];
  images: ProductImage[];
  prices: RegionalPrice[];
  rating?: number;
  reviewCount?: number;
  viewersNow?: number;
  isNew?: boolean;
  colors?: ProductColor[];
  sizes?: string[];
  hasSizeGuide?: boolean;
  stock: number;
  details?: { title: string; body: string }[];
  category?: { slug: CategorySlug; label: string };
  subcategoryLabel?: string;
}
