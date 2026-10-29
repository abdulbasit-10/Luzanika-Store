import {
  ProductCard,
  type ProductCardVariant,
} from "@/components/shared/product-card";
import type { ProductSummary } from "@/types/product";

interface ProductGridProps {
  products: ProductSummary[];
  variant?: ProductCardVariant;
}

export function ProductGrid({ products, variant }: ProductGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} variant={variant} />
        </li>
      ))}
    </ul>
  );
}
