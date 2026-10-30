import {
  ProductCard,
  type ProductCardVariant,
} from "@/components/shared/product-card";
import type { ProductSummary } from "@/types/product";
import { cn } from "@/utils/cn";

interface ProductGridProps {
  products: ProductSummary[];
  variant?: ProductCardVariant;
  layout?: "grid" | "list";
  /** Column classes for the grid layout. Defaults to the home page 2/4 columns. */
  columnsClassName?: string;
  sizes?: string;
}

export function ProductGrid({
  products,
  variant,
  layout = "grid",
  columnsClassName = "grid-cols-2 lg:grid-cols-4",
  sizes,
}: ProductGridProps) {
  return (
    <ul
      className={cn(
        layout === "list"
          ? "flex flex-col gap-6"
          : cn("grid gap-x-6 gap-y-8", columnsClassName),
      )}
    >
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            variant={variant}
            layout={layout}
            sizes={sizes}
          />
        </li>
      ))}
    </ul>
  );
}
