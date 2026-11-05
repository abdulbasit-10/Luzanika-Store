import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";

export interface Subcategory {
  id: string;
  slug: string;
  label: string;
  shortLabel: string | null;
  sort: number;
  productCount: number;
}

export interface CategoryCollection {
  id: string;
  slug: string;
  label: string;
}

export interface Category {
  id: string;
  slug: string;
  label: string;
  heroTitle: string;
  title: string;
  description: string;
  heroImage: { src: string; alt: string; position: string | null };
  /** Text of the first pill on the category page, e.g. "ALL MEN". */
  allLabel: string;
  filterSizes: string[];
  /** Bounds of the price slider, in minor units. */
  priceRange: { min: number; max: number; step: number };
  sort: number;
  productCount: number;
  subcategories: Subcategory[];
  /** The "Category" filter choices of this page, in order. */
  collections: CategoryCollection[];
}

export interface Collection {
  id: string;
  slug: string;
  label: string;
  productCount: number;
}

export type HomeSectionName = "featured" | "new-arrivals" | "special-offers";

export interface HomeSection {
  section: HomeSectionName;
  products: { id: string; slug: string; name: string }[];
}

/** What the category form sends. The price slider is in minor units (paisa / cents). */
export interface CategoryBody {
  slug: string;
  label: string;
  heroTitle: string;
  title: string;
  description: string;
  heroImageSrc: string;
  heroImageAlt: string;
  heroImagePosition: string | null;
  allLabel: string;
  filterSizes: string[];
  priceMin: number;
  priceMax: number;
  priceStep: number;
}

export async function fetchCategories(): Promise<Category[]> {
  return (await apiGet<{ items: Category[] }>("/admin/categories")).items;
}

export async function createCategory(body: CategoryBody): Promise<Category> {
  return (await apiPost<{ category: Category }>("/admin/categories", body))
    .category;
}

export async function updateCategory(
  id: string,
  body: Partial<CategoryBody>,
): Promise<Category> {
  return (
    await apiPatch<{ category: Category }>(
      `/admin/categories/${encodeURIComponent(id)}`,
      body,
    )
  ).category;
}

export const deleteCategory = (id: string) =>
  apiDelete(`/admin/categories/${encodeURIComponent(id)}`);

export interface SubcategoryBody {
  slug: string;
  label: string;
  shortLabel: string | null;
}

export const createSubcategory = (categoryId: string, body: SubcategoryBody) =>
  apiPost(
    `/admin/categories/${encodeURIComponent(categoryId)}/subcategories`,
    body,
  );

export const updateSubcategory = (
  id: string,
  body: Partial<SubcategoryBody & { sort: number }>,
) => apiPatch(`/admin/subcategories/${encodeURIComponent(id)}`, body);

export const deleteSubcategory = (id: string) =>
  apiDelete(`/admin/subcategories/${encodeURIComponent(id)}`);

/** The filter choices of a category page, in the order given. */
export const setCategoryCollections = (id: string, collectionIds: string[]) =>
  apiPut(`/admin/categories/${encodeURIComponent(id)}/collections`, {
    collectionIds,
  });

export async function fetchCollections(): Promise<Collection[]> {
  return (await apiGet<{ items: Collection[] }>("/admin/collections")).items;
}

export const createCollection = (body: { slug: string; label: string }) =>
  apiPost("/admin/collections", body);

export const updateCollection = (
  id: string,
  body: Partial<{ slug: string; label: string }>,
) => apiPatch(`/admin/collections/${encodeURIComponent(id)}`, body);

export const deleteCollection = (id: string) =>
  apiDelete(`/admin/collections/${encodeURIComponent(id)}`);

export async function fetchHomeSections(): Promise<HomeSection[]> {
  return (await apiGet<{ items: HomeSection[] }>("/admin/home-sections")).items;
}

export const setHomeSection = (
  section: HomeSectionName,
  productIds: string[],
) => apiPut(`/admin/home-sections/${section}`, { productIds });

/** When the "Special offers" row ends, and its headline. Both are optional. */
export interface Offer {
  /** ISO 8601, or null for a row without a countdown. */
  endsAt: string | null;
  headline: string | null;
}

export async function fetchOffer(): Promise<Offer> {
  return (await apiGet<{ offer: Offer }>("/admin/home-offer")).offer;
}

export async function saveOffer(offer: Offer): Promise<Offer> {
  return (await apiPut<{ offer: Offer }>("/admin/home-offer", offer)).offer;
}
