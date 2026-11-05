import {
  ALL_SUBCATEGORY,
  type CatalogFacets,
  type CatalogProduct,
  type CategoryDefinition,
  type FilterOption,
} from "@/features/catalog/types";
import type {
  ProductDetail,
  ProductVariant,
} from "@/features/product-detail/types";
import type { ListedProduct } from "@/features/products/types";
import type {
  ProductColor,
  ProductImage,
  ProductSummary,
} from "@/types/product";
import type { RegionalPrice, RegionCode } from "@/types/region";

import type {
  CategoryCollectionRow,
  CategoryRow,
  ImageRow,
  InventoryRow,
  PriceRow,
  ProductParts,
  ProductRow,
  SectionRow,
  SubcategoryRow,
  VariantRow,
} from "@/server/repositories/catalog-repository";

/** Pure row-to-page-shape mapping, kept apart from the queries so it can be tested without a database. */

export const AVAILABILITY_OPTIONS: FilterOption[] = [
  { value: "in-stock", label: "In Stock Atelier" },
  { value: "pre-order", label: "Pre-Order Archive" },
  { value: "fitting-ready", label: "Complimentary Fitting Ready" },
];

const MARKETS: RegionCode[] = ["PK", "DE"];

/** Groups rows by their product id, keeping the order they arrived in. */
function groupByProduct<T extends { product_id: string }>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const group = groups.get(row.product_id);
    if (group) group.push(row);
    else groups.set(row.product_id, [row]);
  }
  return groups;
}

function toPrice(row: PriceRow): RegionalPrice {
  return {
    region: row.market,
    currency: row.currency,
    amount: Number(row.amount),
    ...(row.compare_at_amount !== null
      ? { compareAtAmount: Number(row.compare_at_amount) }
      : {}),
    ...(row.discount_percent !== null
      ? { discountPercent: row.discount_percent }
      : {}),
  };
}

function toImage(row: ImageRow): ProductImage {
  return {
    src: row.src,
    alt: row.alt,
    ...(row.position ? { position: row.position } : {}),
  };
}

/** Colours and sizes in the order the variants list them, each once. */
export function distinctOptions(variants: VariantRow[]) {
  const colors = new Map<string, ProductColor>();
  const sizes = new Set<string>();
  for (const variant of variants) {
    if (variant.color_name && variant.color_hex) {
      colors.set(variant.color_name, {
        name: variant.color_name,
        hex: variant.color_hex,
      });
    }
    if (variant.size_label) sizes.add(variant.size_label);
  }
  return {
    colors: colors.size ? [...colors.values()] : undefined,
    sizes: sizes.size ? [...sizes] : undefined,
  };
}

/** A product with the "NEW ARRIVAL" badge is also marked new on its own page. */
function isNewOnPage(row: ProductRow) {
  return row.is_new || row.badge_label === "NEW ARRIVAL";
}

function ratingOf(row: ProductRow) {
  return row.rating_avg === null ? undefined : Number(row.rating_avg);
}

/** A product as shown on a card: first photo, prices, colours and sizes. */
export function toSummary(
  row: ProductRow,
  parts: ProductParts,
): ProductSummary {
  const prices = parts.prices.filter((item) => item.product_id === row.id);
  const image = parts.images.find((item) => item.product_id === row.id);
  const { colors, sizes } = distinctOptions(
    parts.variants.filter((item) => item.product_id === row.id),
  );

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    ...(image ? { image: toImage(image) } : {}),
    prices: prices.map(toPrice),
    rating: ratingOf(row),
    colors,
    sizes,
    notes: row.notes.length ? row.notes : undefined,
    isNew: row.is_new || undefined,
    badge:
      row.badge_label && row.badge_tone
        ? { label: row.badge_label, tone: row.badge_tone }
        : undefined,
  };
}

export function toCatalogProduct(
  row: ProductRow,
  parts: ProductParts,
): CatalogProduct {
  return {
    ...toSummary(row, parts),
    subcategory: row.subcategory_slug ?? "",
    collection: row.collection_slug ?? "",
    availability: row.availability ?? "",
  };
}

/** A product on the all-products page, with the names the search also looks at. */
export function toListedProduct(
  row: ProductRow,
  parts: ProductParts,
): ListedProduct {
  const summary = toSummary(row, parts);
  if (!row.category_slug) return summary;

  return {
    ...summary,
    // On this page the sidebar "Category" filter is the main category.
    collection: row.category_slug,
    availability: row.availability ?? undefined,
    categoryLabel: row.category_label ?? undefined,
    subcategoryLabel:
      row.subcategory_short_label ?? row.subcategory_label ?? undefined,
    collectionLabel: row.collection_label ?? undefined,
  };
}

export function toCategoryDefinition(
  row: CategoryRow,
  subcategories: SubcategoryRow[],
): CategoryDefinition {
  return {
    slug: row.slug,
    label: row.label,
    heroTitle: row.hero_title,
    title: row.title,
    description: row.description,
    heroImage: {
      src: row.hero_image_src,
      alt: row.hero_image_alt,
      ...(row.hero_image_position ? { position: row.hero_image_position } : {}),
    },
    subcategories: [
      { slug: ALL_SUBCATEGORY, label: row.all_label },
      ...subcategories
        .filter((item) => item.category_id === row.id)
        .map((item) => ({
          slug: item.slug,
          label: item.label,
          ...(item.short_label ? { shortLabel: item.short_label } : {}),
        })),
    ],
  };
}

export function toFacets(
  row: CategoryRow,
  collections: CategoryCollectionRow[],
): CatalogFacets {
  return {
    collections: collections
      .filter((item) => item.category_id === row.id)
      .map((item) => ({ value: item.slug, label: item.label })),
    sizes: row.filter_sizes,
    availability: AVAILABILITY_OPTIONS,
    priceRange: {
      min: Number(row.price_min),
      max: Number(row.price_max),
      step: Number(row.price_step),
    },
  };
}

/** Facets of the all-products page: the main categories, plus sizes and price bounds merged across them. */
export function toListingFacets(categories: CategoryRow[]): CatalogFacets {
  const sizes = new Set<string>();
  for (const category of categories) {
    for (const size of category.filter_sizes) sizes.add(size);
  }

  return {
    collections: categories.map((category) => ({
      value: category.slug,
      label: category.label,
    })),
    sizes: [...sizes],
    availability: AVAILABILITY_OPTIONS,
    priceRange: {
      min: Math.min(...categories.map((item) => Number(item.price_min))),
      max: Math.max(...categories.map((item) => Number(item.price_max))),
      step: Math.min(...categories.map((item) => Number(item.price_step))),
    },
  };
}

export function toProductDetail(
  row: ProductRow,
  parts: ProductParts,
  sections: SectionRow[],
  stock: InventoryRow[],
): ProductDetail {
  const variants = parts.variants.filter((item) => item.product_id === row.id);
  const { colors, sizes } = distinctOptions(variants);
  const prices = groupByProduct(parts.prices).get(row.id) ?? [];
  const images = groupByProduct(parts.images).get(row.id) ?? [];

  const stockByVariant = new Map<string, Record<RegionCode, number>>();
  for (const item of stock) {
    const entry =
      stockByVariant.get(item.variant_id) ??
      ({ PK: 0, DE: 0 } as Record<RegionCode, number>);
    entry[item.market] = Math.max(0, Number(item.available));
    stockByVariant.set(item.variant_id, entry);
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? undefined,
    notes: row.notes.length ? row.notes : undefined,
    images: images.map(toImage),
    prices: prices.map(toPrice),
    rating: ratingOf(row),
    reviewCount: row.rating_count > 0 ? row.rating_count : undefined,
    isNew: isNewOnPage(row) || undefined,
    colors,
    sizes,
    hasSizeGuide: row.has_size_guide,
    variants: variants.map((variant): ProductVariant => ({
      id: variant.id,
      ...(variant.color_name ? { color: variant.color_name } : {}),
      ...(variant.size_label ? { size: variant.size_label } : {}),
      stock:
        stockByVariant.get(variant.id) ??
        (Object.fromEntries(MARKETS.map((market) => [market, 0])) as Record<
          RegionCode,
          number
        >),
    })),
    details: sections.length
      ? sections.map(({ title, body }) => ({ title, body }))
      : undefined,
    category:
      row.category_slug && row.category_label
        ? { slug: row.category_slug, label: row.category_label }
        : undefined,
    subcategoryLabel:
      row.subcategory_short_label ?? row.subcategory_label ?? undefined,
  };
}
