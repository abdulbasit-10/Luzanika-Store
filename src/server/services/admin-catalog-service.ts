import "server-only";

import { recordAudit } from "@/server/audit/audit";
import { refreshCatalogCache } from "@/server/catalog/refresh-cache";
import { isForeignKeyViolation, isUniqueViolation } from "@/server/db/errors";
import { withTransaction } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import {
  adminCatalogRepository,
  type CategoryFields,
  type CategoryRow,
  type CollectionRow,
  type HomeSection,
  type SubcategoryRow,
} from "@/server/repositories/admin-catalog-repository";
import type { AdminContext } from "@/server/services/staff-admin-service";

export interface CategoryDto {
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
  subcategories: SubcategoryDto[];
  /** The "Category" filter choices of this page, in order. */
  collections: { id: string; slug: string; label: string }[];
}

export interface SubcategoryDto {
  id: string;
  slug: string;
  label: string;
  shortLabel: string | null;
  sort: number;
  productCount: number;
}

export interface CollectionDto {
  id: string;
  slug: string;
  label: string;
  productCount: number;
}

const notFound = (what: string) =>
  new ApiError("not_found", { message: `This ${what} does not exist.` });

const slugTaken = () =>
  new ApiError("conflict", {
    message: "This slug is already used.",
    fields: { slug: "This slug is already used" },
  });

function toSubcategory(row: SubcategoryRow): SubcategoryDto {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    shortLabel: row.short_label,
    sort: row.sort,
    productCount: row.product_count,
  };
}

function toCollection(row: CollectionRow): CollectionDto {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    productCount: row.product_count,
  };
}

function toCategory(
  row: CategoryRow,
  subcategories: SubcategoryRow[],
  collections: { id: string; slug: string; label: string }[],
): CategoryDto {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    heroTitle: row.hero_title,
    title: row.title,
    description: row.description,
    heroImage: {
      src: row.hero_image_src,
      alt: row.hero_image_alt,
      position: row.hero_image_position,
    },
    allLabel: row.all_label,
    filterSizes: row.filter_sizes,
    priceRange: {
      min: Number(row.price_min),
      max: Number(row.price_max),
      step: Number(row.price_step),
    },
    sort: row.sort,
    productCount: row.product_count,
    subcategories: subcategories
      .filter((sub) => sub.category_id === row.id)
      .map(toSubcategory),
    collections,
  };
}

async function loadCategories(): Promise<CategoryDto[]> {
  const [categories, subcategories, collections, links] = await Promise.all([
    adminCatalogRepository.listCategories(),
    adminCatalogRepository.listSubcategories(),
    adminCatalogRepository.listCollections(),
    adminCatalogRepository.listCategoryCollections(),
  ]);
  const byId = new Map(collections.map((item) => [item.id, item]));
  return categories.map((category) =>
    toCategory(
      category,
      subcategories,
      links
        .filter((link) => link.category_id === category.id)
        .flatMap((link) => {
          const collection = byId.get(link.collection_id);
          return collection
            ? [
                {
                  id: collection.id,
                  slug: collection.slug,
                  label: collection.label,
                },
              ]
            : [];
        }),
    ),
  );
}

export async function listCategories(): Promise<CategoryDto[]> {
  return loadCategories();
}

export async function getCategory(id: string): Promise<CategoryDto> {
  const found = (await loadCategories()).find((category) => category.id === id);
  if (!found) throw notFound("category");
  return found;
}

/** The price slider must make sense: a minimum below the maximum, in whole steps of at least 1. */
function checkPriceRange(range: {
  priceMin: number;
  priceMax: number;
  priceStep: number;
}): void {
  if (range.priceMax <= range.priceMin) {
    throw new ApiError("validation_failed", {
      message: "The highest price must be above the lowest.",
      fields: { priceMax: "The highest price must be above the lowest" },
    });
  }
}

export async function createCategory(
  ctx: AdminContext,
  fields: CategoryFields,
): Promise<CategoryDto> {
  checkPriceRange(fields);
  let id: string;
  try {
    id = await withTransaction(async (tx) => {
      const created = await adminCatalogRepository.insertCategory(fields, tx);
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "categories.create",
          entityType: "category",
          entityId: created,
          after: fields,
        },
        ctx.requestId,
      );
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
  refreshCatalogCache();
  return getCategory(id);
}

export async function updateCategory(
  ctx: AdminContext,
  id: string,
  changes: Partial<CategoryFields>,
): Promise<CategoryDto> {
  try {
    await withTransaction(async (tx) => {
      const before = await adminCatalogRepository.findCategory(id, tx);
      if (!before) throw notFound("category");

      checkPriceRange({
        priceMin: changes.priceMin ?? Number(before.price_min),
        priceMax: changes.priceMax ?? Number(before.price_max),
        priceStep: changes.priceStep ?? Number(before.price_step),
      });
      await adminCatalogRepository.updateCategory(id, changes, tx);
      const after = (await adminCatalogRepository.findCategory(id, tx))!;
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "categories.update",
          entityType: "category",
          entityId: id,
          before: toCategory(before, [], []),
          after: toCategory(after, [], []),
        },
        ctx.requestId,
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
  refreshCatalogCache();
  return getCategory(id);
}

export async function deleteCategory(
  ctx: AdminContext,
  id: string,
): Promise<void> {
  try {
    await withTransaction(async (tx) => {
      const category = await adminCatalogRepository.findCategory(id, tx);
      if (!category) throw notFound("category");
      const products = await adminCatalogRepository.productsInCategory(id, tx);
      if (products > 0) {
        throw new ApiError("conflict", {
          message: `${products} product${products === 1 ? " still belongs" : "s still belong"} to this category. Move or delete ${products === 1 ? "it" : "them"} first.`,
        });
      }
      await adminCatalogRepository.deleteCategory(id, tx);
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "categories.delete",
          entityType: "category",
          entityId: id,
          before: toCategory(category, [], []),
        },
        ctx.requestId,
      );
    });
  } catch (error) {
    // A product was added at the very same moment.
    if (isForeignKeyViolation(error)) {
      throw new ApiError("conflict", {
        message: "Products still belong to this category.",
      });
    }
    throw error;
  }
  refreshCatalogCache();
}

// ------------------------------------------------------------ subcategories

export async function createSubcategory(
  ctx: AdminContext,
  categoryId: string,
  fields: {
    slug: string;
    label: string;
    shortLabel: string | null;
    sort: number;
  },
): Promise<SubcategoryDto> {
  let id: string;
  try {
    id = await withTransaction(async (tx) => {
      if (!(await adminCatalogRepository.findCategory(categoryId, tx))) {
        throw notFound("category");
      }
      const created = await adminCatalogRepository.insertSubcategory(
        { categoryId, ...fields },
        tx,
      );
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "subcategories.create",
          entityType: "subcategory",
          entityId: created,
          after: { categoryId, ...fields },
        },
        ctx.requestId,
      );
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
  refreshCatalogCache();
  return toSubcategory((await adminCatalogRepository.findSubcategory(id))!);
}

export async function updateSubcategory(
  ctx: AdminContext,
  id: string,
  changes: {
    slug?: string;
    label?: string;
    shortLabel?: string | null;
    sort?: number;
  },
): Promise<SubcategoryDto> {
  try {
    await withTransaction(async (tx) => {
      const before = await adminCatalogRepository.findSubcategory(id, tx);
      if (!before) throw notFound("subcategory");
      await adminCatalogRepository.updateSubcategory(id, changes, tx);
      const after = (await adminCatalogRepository.findSubcategory(id, tx))!;
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "subcategories.update",
          entityType: "subcategory",
          entityId: id,
          before: toSubcategory(before),
          after: toSubcategory(after),
        },
        ctx.requestId,
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
  refreshCatalogCache();
  return toSubcategory((await adminCatalogRepository.findSubcategory(id))!);
}

export async function deleteSubcategory(
  ctx: AdminContext,
  id: string,
): Promise<void> {
  try {
    await withTransaction(async (tx) => {
      const sub = await adminCatalogRepository.findSubcategory(id, tx);
      if (!sub) throw notFound("subcategory");
      const products = await adminCatalogRepository.productsInSubcategory(
        id,
        tx,
      );
      if (products > 0) {
        throw new ApiError("conflict", {
          message: `${products} product${products === 1 ? " still belongs" : "s still belong"} to this subcategory. Move ${products === 1 ? "it" : "them"} first.`,
        });
      }
      await adminCatalogRepository.deleteSubcategory(id, tx);
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "subcategories.delete",
          entityType: "subcategory",
          entityId: id,
          before: toSubcategory(sub),
        },
        ctx.requestId,
      );
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError("conflict", {
        message: "Products still belong to this subcategory.",
      });
    }
    throw error;
  }
  refreshCatalogCache();
}

// -------------------------------------------------------------- collections

export async function listCollections(): Promise<CollectionDto[]> {
  return (await adminCatalogRepository.listCollections()).map(toCollection);
}

export async function createCollection(
  ctx: AdminContext,
  fields: { slug: string; label: string },
): Promise<CollectionDto> {
  let id: string;
  try {
    id = await withTransaction(async (tx) => {
      const created = await adminCatalogRepository.insertCollection(fields, tx);
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "collections.create",
          entityType: "collection",
          entityId: created,
          after: fields,
        },
        ctx.requestId,
      );
      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
  refreshCatalogCache();
  return toCollection((await adminCatalogRepository.findCollection(id))!);
}

export async function updateCollection(
  ctx: AdminContext,
  id: string,
  changes: { slug?: string; label?: string },
): Promise<CollectionDto> {
  try {
    await withTransaction(async (tx) => {
      const before = await adminCatalogRepository.findCollection(id, tx);
      if (!before) throw notFound("collection");
      await adminCatalogRepository.updateCollection(id, changes, tx);
      const after = (await adminCatalogRepository.findCollection(id, tx))!;
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "collections.update",
          entityType: "collection",
          entityId: id,
          before: toCollection(before),
          after: toCollection(after),
        },
        ctx.requestId,
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
  refreshCatalogCache();
  return toCollection((await adminCatalogRepository.findCollection(id))!);
}

export async function deleteCollection(
  ctx: AdminContext,
  id: string,
): Promise<void> {
  await withTransaction(async (tx) => {
    const collection = await adminCatalogRepository.findCollection(id, tx);
    if (!collection) throw notFound("collection");
    if (collection.product_count > 0) {
      throw new ApiError("conflict", {
        message: `${collection.product_count} product${collection.product_count === 1 ? " is" : "s are"} in this collection. Move ${collection.product_count === 1 ? "it" : "them"} first.`,
      });
    }
    await adminCatalogRepository.deleteCollection(id, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "collections.delete",
        entityType: "collection",
        entityId: id,
        before: toCollection(collection),
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
}

/** Chooses which collections a category page offers as its "Category" filter, in this order. */
export async function setCategoryCollections(
  ctx: AdminContext,
  categoryId: string,
  collectionIds: string[],
): Promise<CategoryDto> {
  await withTransaction(async (tx) => {
    if (!(await adminCatalogRepository.findCategory(categoryId, tx))) {
      throw notFound("category");
    }
    const existing = new Set(
      await adminCatalogRepository.existingCollectionIds(collectionIds, tx),
    );
    if (collectionIds.some((id) => !existing.has(id))) {
      throw new ApiError("validation_failed", {
        fields: { collectionIds: "One of these collections does not exist" },
      });
    }
    const before = (await adminCatalogRepository.listCategoryCollections(tx))
      .filter((link) => link.category_id === categoryId)
      .map((link) => link.collection_id);
    await adminCatalogRepository.setCategoryCollections(
      categoryId,
      collectionIds,
      tx,
    );
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "categories.collections",
        entityType: "category",
        entityId: categoryId,
        before: { collectionIds: before },
        after: { collectionIds },
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
  return getCategory(categoryId);
}

// ------------------------------------------------------------ home sections

export interface HomeSectionsDto {
  section: HomeSection;
  products: { id: string; slug: string; name: string }[];
}

export async function getHomeSections(): Promise<HomeSectionsDto[]> {
  const rows = await adminCatalogRepository.listHome();
  const sections: HomeSection[] = [
    "featured",
    "new-arrivals",
    "special-offers",
  ];
  return sections.map((section) => ({
    section,
    products: rows
      .filter((row) => row.section === section)
      .map((row) => ({
        id: row.product_id,
        slug: row.product_slug,
        name: row.product_name,
      })),
  }));
}

/** Replaces one home page section with exactly these products, in this order. */
export async function setHomeSection(
  ctx: AdminContext,
  section: HomeSection,
  productIds: string[],
): Promise<HomeSectionsDto[]> {
  await withTransaction(async (tx) => {
    const existing = new Set(
      await adminCatalogRepository.existingProductIds(productIds, tx),
    );
    if (productIds.some((id) => !existing.has(id))) {
      throw new ApiError("validation_failed", {
        fields: { productIds: "One of these products does not exist" },
      });
    }
    const before = (await adminCatalogRepository.listHome(tx))
      .filter((row) => row.section === section)
      .map((row) => row.product_id);
    await adminCatalogRepository.setHomeSection(section, productIds, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "home.update",
        entityType: "home_section",
        entityId: section,
        before: { productIds: before },
        after: { productIds },
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
  return getHomeSections();
}
