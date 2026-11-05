import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import type { RegionCode } from "@/types/region";

export type ProductStatus = "draft" | "active" | "archived";
export type DeletedFilter = "exclude" | "include" | "only";
export type Availability = "in-stock" | "pre-order" | "fitting-ready";

/** Minor units (paisa / cents) in the market's own currency. */
export interface Price {
  amount: number;
  compareAtAmount: number | null;
}
export type Prices = Record<RegionCode, Price | null>;

/** One row of GET /admin/products. */
export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  status: ProductStatus;
  listed: boolean;
  isNew: boolean;
  category: { id: string; label: string } | null;
  subcategoryLabel: string | null;
  image: { src: string; alt: string } | null;
  variantCount: number;
  prices: Prices;
  available: Record<RegionCode, number>;
  deletedAt: string | null;
  sort: number;
}

export interface ProductPage {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductFilters {
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  deleted?: DeletedFilter;
}

export interface Variant {
  id: string;
  sku: string;
  color: { name: string; hex: string } | null;
  size: string | null;
  sort: number;
  active: boolean;
  stock: Record<
    RegionCode,
    { onHand: number; reserved: number; available: number }
  >;
}

export interface ProductImage {
  id: string;
  src: string;
  alt: string;
  position: string | null;
  sort: number;
}

/** GET /admin/products/:id */
export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  status: ProductStatus;
  listed: boolean;
  isNew: boolean;
  availability: Availability | null;
  badge: { label: string; tone: "dark" | "light" } | null;
  notes: string[];
  hasSizeGuide: boolean;
  sort: number;
  category: { id: string; slug: string; label: string } | null;
  subcategory: { id: string; label: string } | null;
  collection: { id: string; label: string } | null;
  prices: Prices;
  images: ProductImage[];
  variants: Variant[];
  sections: { title: string; body: string }[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  slug: string;
  label: string;
  subcategories: { id: string; slug: string; label: string }[];
}

export interface Collection {
  id: string;
  slug: string;
  label: string;
}

/** What the "basics" form sends, for a new product and for a change. */
export interface ProductBasics {
  name: string;
  slug?: string;
  tagline: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  collectionId: string | null;
  availability: Availability | null;
  badge: { label: string; tone: "dark" | "light" } | null;
  isNew: boolean;
  notes: string[];
  hasSizeGuide: boolean;
  listed: boolean;
}

export interface NewVariant {
  sku: string;
  colorName: string | null;
  colorHex: string | null;
  sizeLabel: string | null;
  active: boolean;
  stock: Partial<Record<RegionCode, number>>;
}

export interface VariantChange {
  sku?: string;
  colorName?: string | null;
  colorHex?: string | null;
  sizeLabel?: string | null;
  active?: boolean;
}

/** Product answers come as { product } or the product itself. */
function unwrap(answer: { product: Product } | Product): Product {
  return "product" in answer ? answer.product : answer;
}

const base = (id: string) => `/admin/products/${encodeURIComponent(id)}`;

export const fetchProducts = (
  filters: ProductFilters,
  page: number,
  pageSize: number,
) =>
  apiGet<ProductPage>("/admin/products", {
    params: {
      ...filters,
      search: filters.search?.trim() || undefined,
      deleted: filters.deleted === "exclude" ? undefined : filters.deleted,
      page,
      pageSize,
    },
  });

export const fetchProduct = async (id: string) =>
  unwrap(await apiGet<{ product: Product } | Product>(base(id)));

export async function fetchCategories(): Promise<Category[]> {
  const answer = await apiGet<{ items: Category[] }>("/admin/categories");
  return answer.items;
}

export async function fetchCollections(): Promise<Collection[]> {
  const answer = await apiGet<{ items: Collection[] }>("/admin/collections");
  return answer.items;
}

export async function createProduct(body: ProductBasics): Promise<Product> {
  return unwrap(await apiPost<{ product: Product }>("/admin/products", body));
}

export type ProductPatch = Partial<ProductBasics> & { status?: ProductStatus };

export async function updateProduct(
  id: string,
  patch: ProductPatch,
): Promise<Product> {
  return unwrap(await apiPatch<{ product: Product }>(base(id), patch));
}

export async function deleteProduct(id: string): Promise<Product> {
  return unwrap(await apiDelete<{ product: Product }>(base(id)));
}

export async function restoreProduct(id: string): Promise<Product> {
  return unwrap(await apiPost<{ product: Product }>(`${base(id)}/restore`));
}

export async function setPrices(
  id: string,
  prices: Partial<Record<RegionCode, Price | null>>,
): Promise<Product> {
  return unwrap(
    await apiPut<{ product: Product }>(`${base(id)}/prices`, prices),
  );
}

export async function addVariant(
  id: string,
  variant: NewVariant,
): Promise<Product> {
  return unwrap(
    await apiPost<{ product: Product }>(`${base(id)}/variants`, variant),
  );
}

export async function updateVariant(
  variantId: string,
  change: VariantChange,
): Promise<Product> {
  return unwrap(
    await apiPatch<{ product: Product }>(
      `/admin/variants/${encodeURIComponent(variantId)}`,
      change,
    ),
  );
}

export async function setSections(
  id: string,
  sections: { title: string; body: string }[],
): Promise<Product> {
  return unwrap(
    await apiPut<{ product: Product }>(`${base(id)}/sections`, { sections }),
  );
}

export async function uploadImage(id: string, file: File): Promise<Product> {
  const form = new FormData();
  form.append("photo", file);
  return unwrap(
    await apiPost<{ product: Product }>(`${base(id)}/images`, form, {
      timeout: 60_000,
    }),
  );
}

export async function updateImage(
  id: string,
  imageId: string,
  change: { alt?: string; position?: string | null },
): Promise<Product> {
  return unwrap(
    await apiPatch<{ product: Product }>(
      `${base(id)}/images/${encodeURIComponent(imageId)}`,
      change,
    ),
  );
}

export async function reorderImages(
  id: string,
  ids: string[],
): Promise<Product> {
  return unwrap(
    await apiPut<{ product: Product }>(`${base(id)}/images/order`, { ids }),
  );
}

export async function removeImage(
  id: string,
  imageId: string,
): Promise<Product> {
  return unwrap(
    await apiDelete<{ product: Product }>(
      `${base(id)}/images/${encodeURIComponent(imageId)}`,
    ),
  );
}
