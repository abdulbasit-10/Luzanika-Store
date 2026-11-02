import "server-only";

import { randomBytes } from "node:crypto";

import { recordAudit } from "@/server/audit/audit";
import { refreshCatalogCache } from "@/server/catalog/refresh-cache";
import { slugify } from "@/server/catalog/slugify";
import { constraintOf, isUniqueViolation } from "@/server/db/errors";
import { withTransaction, type Tx } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import { logger, serializeError } from "@/server/logger";
import {
  MAX_PHOTOS_PER_PRODUCT,
  processProductPhoto,
} from "@/server/media/product-image";
import { adminCatalogRepository } from "@/server/repositories/admin-catalog-repository";
import {
  adminProductRepository,
  type DeletedFilter,
  type ProductChanges,
  type ProductFilter,
  type ProductRow,
  type VariantChanges,
  type VariantRow,
} from "@/server/repositories/admin-product-repository";
import type { Market } from "@/server/repositories/order-repository";
import type { AdminContext } from "@/server/services/staff-admin-service";
import { getStorage } from "@/server/storage";
import type {
  CreateProductBody,
  CreateVariantBody,
  SetPricesBody,
  UpdateImageBody,
  UpdateProductBody,
  UpdateVariantBody,
} from "@/server/validation/admin-product-schemas";

const MARKETS: Market[] = ["PK", "DE"];
const iso = (value: Date | null) =>
  value === null ? null : new Date(value).toISOString();

export interface PriceDto {
  /** Minor units. */
  amount: number;
  compareAtAmount: number | null;
}

export interface ProductListItemDto {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "active" | "archived";
  listed: boolean;
  isNew: boolean;
  category: { id: string; label: string } | null;
  subcategoryLabel: string | null;
  image: { src: string; alt: string } | null;
  variantCount: number;
  prices: Record<Market, PriceDto | null>;
  /** Units that can be sold now (on hand minus reserved) over the active variants. */
  available: Record<Market, number>;
  deletedAt: string | null;
  sort: number;
}

export interface VariantDto {
  id: string;
  sku: string;
  color: { name: string; hex: string } | null;
  size: string | null;
  sort: number;
  active: boolean;
  stock: Record<
    Market,
    { onHand: number; reserved: number; available: number }
  >;
}

export interface ProductDto {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  status: "draft" | "active" | "archived";
  listed: boolean;
  isNew: boolean;
  availability: string | null;
  badge: { label: string; tone: "dark" | "light" } | null;
  notes: string[];
  hasSizeGuide: boolean;
  sort: number;
  category: { id: string; slug: string; label: string } | null;
  subcategory: { id: string; label: string } | null;
  collection: { id: string; label: string } | null;
  prices: Record<Market, PriceDto | null>;
  images: {
    id: string;
    src: string;
    alt: string;
    position: string | null;
    sort: number;
  }[];
  variants: VariantDto[];
  sections: { title: string; body: string }[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const notFound = () =>
  new ApiError("not_found", { message: "This product does not exist." });

const slugTaken = () =>
  new ApiError("conflict", {
    message: "This slug is already used by another product.",
    fields: { slug: "This slug is already used by another product" },
  });

function emptyPrices(): Record<Market, PriceDto | null> {
  return { PK: null, DE: null };
}

// ------------------------------------------------------------------- reading

export async function listProducts(
  filter: Omit<ProductFilter, "deleted"> & { deleted: DeletedFilter },
  page: number,
  pageSize: number,
) {
  const { rows, total } = await adminProductRepository.list(
    filter,
    pageSize,
    (page - 1) * pageSize,
  );
  const ids = rows.map((row) => row.id);
  const [prices, available] = await Promise.all([
    adminProductRepository.listPrices(ids),
    adminProductRepository.listAvailableByProduct(ids),
  ]);

  const items: ProductListItemDto[] = rows.map((row) => {
    const productPrices = emptyPrices();
    for (const price of prices.filter((item) => item.product_id === row.id)) {
      productPrices[price.market] = {
        amount: Number(price.amount),
        compareAtAmount:
          price.compare_at_amount === null
            ? null
            : Number(price.compare_at_amount),
      };
    }
    const stock: Record<Market, number> = { PK: 0, DE: 0 };
    for (const entry of available.filter((item) => item.product_id === row.id)) {
      stock[entry.market] = Math.max(0, Number(entry.available));
    }
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      listed: row.listed,
      isNew: row.is_new,
      category: row.category_id
        ? { id: row.category_id, label: row.category_label ?? "" }
        : null,
      subcategoryLabel: row.subcategory_label,
      image: row.image_src
        ? { src: row.image_src, alt: row.image_alt ?? "" }
        : null,
      variantCount: row.variant_count ?? 0,
      prices: productPrices,
      available: stock,
      deletedAt: iso(row.deleted_at),
      sort: row.sort,
    };
  });
  return { items, total, page, pageSize };
}

function toVariantDto(
  variant: VariantRow,
  stock: { variant_id: string; market: Market; on_hand: number; reserved: number }[],
): VariantDto {
  const perMarket: VariantDto["stock"] = {
    PK: { onHand: 0, reserved: 0, available: 0 },
    DE: { onHand: 0, reserved: 0, available: 0 },
  };
  for (const entry of stock.filter((item) => item.variant_id === variant.id)) {
    perMarket[entry.market] = {
      onHand: entry.on_hand,
      reserved: entry.reserved,
      available: entry.on_hand - entry.reserved,
    };
  }
  return {
    id: variant.id,
    sku: variant.sku,
    color:
      variant.color_name && variant.color_hex
        ? { name: variant.color_name, hex: variant.color_hex }
        : null,
    size: variant.size_label,
    sort: variant.sort,
    active: variant.active,
    stock: perMarket,
  };
}

async function build(row: ProductRow, tx?: Tx): Promise<ProductDto> {
  const [prices, variants, sections, images] = await Promise.all([
    adminProductRepository.listPrices([row.id], tx),
    adminProductRepository.listVariants([row.id], tx),
    adminProductRepository.listSections(row.id, tx),
    adminProductRepository.listImages(row.id, tx),
  ]);
  const stock = await adminProductRepository.listVariantStock(
    variants.map((variant) => variant.id),
    tx,
  );

  const productPrices = emptyPrices();
  for (const price of prices) {
    productPrices[price.market] = {
      amount: Number(price.amount),
      compareAtAmount:
        price.compare_at_amount === null
          ? null
          : Number(price.compare_at_amount),
    };
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    status: row.status,
    listed: row.listed,
    isNew: row.is_new,
    availability: row.availability,
    badge:
      row.badge_label && row.badge_tone
        ? { label: row.badge_label, tone: row.badge_tone }
        : null,
    notes: row.notes,
    hasSizeGuide: row.has_size_guide,
    sort: row.sort,
    category: row.category_id
      ? {
          id: row.category_id,
          slug: row.category_slug ?? "",
          label: row.category_label ?? "",
        }
      : null,
    subcategory: row.subcategory_id
      ? { id: row.subcategory_id, label: row.subcategory_label ?? "" }
      : null,
    collection: row.collection_id
      ? { id: row.collection_id, label: row.collection_label ?? "" }
      : null,
    prices: productPrices,
    images: images.map((image) => ({
      id: image.id,
      src: image.src,
      alt: image.alt,
      position: image.position,
      sort: image.sort,
    })),
    variants: variants.map((variant) => toVariantDto(variant, stock)),
    sections,
    deletedAt: iso(row.deleted_at),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function getProduct(id: string, tx?: Tx): Promise<ProductDto> {
  const row = await adminProductRepository.findById(id, tx);
  if (!row) throw notFound();
  return build(row, tx);
}

// ------------------------------------------------------------------ checking

/** The category, subcategory and collection must exist, and the subcategory must belong to the category. */
async function checkReferences(
  refs: {
    categoryId: string | null;
    subcategoryId: string | null;
    collectionId: string | null;
  },
  tx: Tx,
): Promise<void> {
  const fail = (field: string, message: string) =>
    new ApiError("validation_failed", { message, fields: { [field]: message } });

  if (refs.categoryId && !(await adminCatalogRepository.findCategory(refs.categoryId, tx))) {
    throw fail("categoryId", "This category does not exist");
  }
  if (refs.collectionId && !(await adminCatalogRepository.findCollection(refs.collectionId, tx))) {
    throw fail("collectionId", "This collection does not exist");
  }
  if (refs.subcategoryId) {
    if (!refs.categoryId) {
      throw fail("subcategoryId", "Choose a category before choosing a subcategory");
    }
    const sub = await adminCatalogRepository.findSubcategory(refs.subcategoryId, tx);
    if (!sub) throw fail("subcategoryId", "This subcategory does not exist");
    if (sub.category_id !== refs.categoryId) {
      throw fail("subcategoryId", "This subcategory belongs to another category");
    }
  }
}

/** A product can only be on sale when something can be bought: a price and an active variant. */
async function assertSellable(productId: string, tx: Tx): Promise<void> {
  const [prices, variants] = await Promise.all([
    adminProductRepository.countPrices(productId, tx),
    adminProductRepository.countActiveVariants(productId, tx),
  ]);
  if (prices === 0 || variants === 0) {
    throw new ApiError("conflict", {
      message:
        prices === 0 && variants === 0
          ? "Add a price and at least one active variant before putting this product on sale."
          : prices === 0
            ? "Add a price before putting this product on sale."
            : "Add at least one active variant before putting this product on sale.",
    });
  }
}

function snapshot(product: ProductDto) {
  return {
    name: product.name,
    slug: product.slug,
    tagline: product.tagline,
    status: product.status,
    listed: product.listed,
    isNew: product.isNew,
    availability: product.availability,
    badge: product.badge,
    notes: product.notes,
    hasSizeGuide: product.hasSizeGuide,
    sort: product.sort,
    categoryId: product.category?.id ?? null,
    subcategoryId: product.subcategory?.id ?? null,
    collectionId: product.collection?.id ?? null,
  };
}

// ------------------------------------------------------------------ products

export async function createProduct(
  ctx: AdminContext,
  body: CreateProductBody,
): Promise<ProductDto> {
  const explicitSlug = body.slug;
  const base = explicitSlug ?? slugify(body.name);
  if (!base) {
    throw new ApiError("validation_failed", {
      message: "Please give a slug: the name has no letters or digits to make one from.",
      fields: { slug: "Please give a slug" },
    });
  }

  let id: string;
  try {
    id = await withTransaction(async (tx) => {
      await checkReferences(body, tx);

      // A slug made from the name gets -2, -3, ... when taken; one chosen by a person is never changed.
      let slug = base;
      if (await adminProductRepository.slugExists(slug, undefined, tx)) {
        if (explicitSlug) throw slugTaken();
        for (let n = 2; ; n++) {
          slug = `${base.slice(0, 110)}-${n}`;
          if (!(await adminProductRepository.slugExists(slug, undefined, tx))) break;
        }
      }

      const created = await adminProductRepository.insert(
        {
          slug,
          name: body.name,
          tagline: body.tagline,
          categoryId: body.categoryId,
          subcategoryId: body.subcategoryId,
          collectionId: body.collectionId,
          availability: body.availability,
          badgeLabel: body.badge?.label ?? null,
          badgeTone: body.badge?.tone ?? null,
          isNew: body.isNew,
          notes: body.notes,
          hasSizeGuide: body.hasSizeGuide,
          listed: body.listed,
        },
        tx,
      );
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "products.create",
          entityType: "product",
          entityId: created,
          after: snapshot(await getProduct(created, tx)),
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
  return getProduct(id);
}

/** Turns the request into column changes: the badge is one object in the request and two columns in the table. */
function toChanges(body: UpdateProductBody): ProductChanges {
  const { badge, ...rest } = body;
  return {
    ...rest,
    ...(badge !== undefined
      ? { badgeLabel: badge?.label ?? null, badgeTone: badge?.tone ?? null }
      : {}),
  };
}

export async function updateProduct(
  ctx: AdminContext,
  id: string,
  body: UpdateProductBody,
): Promise<ProductDto> {
  try {
    await withTransaction(async (tx) => {
      const current = await adminProductRepository.lockById(id, tx);
      if (!current) throw notFound();
      if (current.deleted_at) {
        throw new ApiError("conflict", {
          message: "This product was deleted. Restore it before changing it.",
        });
      }
      const before = snapshot(await build(current, tx));

      await checkReferences(
        {
          categoryId:
            body.categoryId !== undefined ? body.categoryId : current.category_id,
          subcategoryId:
            body.subcategoryId !== undefined
              ? body.subcategoryId
              : current.subcategory_id,
          collectionId:
            body.collectionId !== undefined
              ? body.collectionId
              : current.collection_id,
        },
        tx,
      );
      if (body.status === "active" && current.status !== "active") {
        await assertSellable(id, tx);
      }
      if (body.slug !== undefined && body.slug !== current.slug) {
        if (await adminProductRepository.slugExists(body.slug, id, tx)) {
          throw slugTaken();
        }
      }

      await adminProductRepository.update(id, toChanges(body), tx);
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "products.update",
          entityType: "product",
          entityId: id,
          before,
          after: snapshot(await getProduct(id, tx)),
        },
        ctx.requestId,
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }

  refreshCatalogCache();
  return getProduct(id);
}

/** Hides a product from the shop (it is kept, with its orders and history, and can be restored). */
export async function deleteProduct(
  ctx: AdminContext,
  id: string,
): Promise<ProductDto> {
  await withTransaction(async (tx) => {
    const current = await adminProductRepository.lockById(id, tx);
    if (!current) throw notFound();
    if (current.deleted_at) {
      throw new ApiError("conflict", { message: "This product is already deleted." });
    }
    await adminProductRepository.softDelete(id, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "products.delete",
        entityType: "product",
        entityId: id,
        before: { status: current.status, name: current.name, slug: current.slug },
        after: { status: "archived", deleted: true },
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
  return getProduct(id);
}

/** Brings a deleted product back as a draft, so it can be checked before it is put on sale again. */
export async function restoreProduct(
  ctx: AdminContext,
  id: string,
): Promise<ProductDto> {
  await withTransaction(async (tx) => {
    const current = await adminProductRepository.lockById(id, tx);
    if (!current) throw notFound();
    if (!current.deleted_at) {
      throw new ApiError("conflict", { message: "This product is not deleted." });
    }
    await adminProductRepository.restore(id, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "products.restore",
        entityType: "product",
        entityId: id,
        before: { deleted: true },
        after: { status: "draft", deleted: false },
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
  return getProduct(id);
}

// -------------------------------------------------------------------- prices

/** Sets or removes the price of a product in each market sent. A removed price means the product is not sold in that market. */
export async function setPrices(
  ctx: AdminContext,
  id: string,
  body: SetPricesBody,
): Promise<ProductDto> {
  await withTransaction(async (tx) => {
    const current = await adminProductRepository.lockById(id, tx);
    if (!current) throw notFound();
    if (current.deleted_at) {
      throw new ApiError("conflict", {
        message: "This product was deleted. Restore it before changing it.",
      });
    }
    const before = (await build(current, tx)).prices;

    for (const market of MARKETS) {
      const price = body[market];
      if (price === undefined) continue;
      if (price === null) {
        await adminProductRepository.deletePrice(id, market, tx);
      } else {
        await adminProductRepository.upsertPrice(id, market, price, tx);
      }
    }
    if (current.status === "active" && (await adminProductRepository.countPrices(id, tx)) === 0) {
      throw new ApiError("conflict", {
        message: "A product on sale needs a price in at least one market. Switch it to draft first.",
      });
    }

    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "products.prices",
        entityType: "product",
        entityId: id,
        before,
        after: (await build(current, tx)).prices,
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
  return getProduct(id);
}

// ------------------------------------------------------------------ variants

function variantConflict(error: unknown): ApiError | null {
  if (!isUniqueViolation(error)) return null;
  const constraint = constraintOf(error) ?? "";
  if (constraint.includes("sku")) {
    return new ApiError("conflict", {
      message: "This SKU is already used.",
      fields: { sku: "This SKU is already used" },
    });
  }
  return new ApiError("conflict", {
    message: "This product already has a variant with this colour and size.",
  });
}

export async function addVariant(
  ctx: AdminContext,
  productId: string,
  body: CreateVariantBody,
): Promise<ProductDto> {
  try {
    await withTransaction(async (tx) => {
      const product = await adminProductRepository.lockById(productId, tx);
      if (!product) throw notFound();
      if (product.deleted_at) {
        throw new ApiError("conflict", {
          message: "This product was deleted. Restore it before changing it.",
        });
      }

      const variantId = await adminProductRepository.insertVariant(
        {
          productId,
          sku: body.sku,
          colorName: body.colorName,
          colorHex: body.colorHex,
          sizeLabel: body.sizeLabel,
          sort: body.sort ?? null,
          active: body.active,
        },
        tx,
      );
      for (const market of MARKETS) {
        const quantity = body.stock[market];
        if (quantity) {
          await adminProductRepository.addInitialStock(
            { variantId, market, quantity, staffId: ctx.actor.id },
            tx,
          );
        }
      }
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "variants.create",
          entityType: "variant",
          entityId: variantId,
          after: { productId, ...body },
        },
        ctx.requestId,
      );
    });
  } catch (error) {
    const conflict = variantConflict(error);
    if (conflict) throw conflict;
    throw error;
  }
  refreshCatalogCache();
  return getProduct(productId);
}

export async function updateVariant(
  ctx: AdminContext,
  variantId: string,
  body: UpdateVariantBody,
): Promise<ProductDto> {
  let productId: string;
  try {
    productId = await withTransaction(async (tx) => {
      const variant = await adminProductRepository.lockVariant(variantId, tx);
      if (!variant) {
        throw new ApiError("not_found", { message: "This variant does not exist." });
      }
      const product = await adminProductRepository.lockById(variant.product_id, tx);
      if (!product || product.deleted_at) {
        throw new ApiError("conflict", {
          message: "This product was deleted. Restore it before changing it.",
        });
      }

      // A colour and its code go together, also after this change.
      const colorName = body.colorName !== undefined ? body.colorName : variant.color_name;
      const colorHex = body.colorHex !== undefined ? body.colorHex : variant.color_hex;
      if ((colorName === null) !== (colorHex === null)) {
        throw new ApiError("validation_failed", {
          message: "Give both the colour name and its code, or neither.",
          fields: { colorHex: "Give both the colour name and its code, or neither" },
        });
      }

      const changes: VariantChanges = body;
      const before = {
        sku: variant.sku,
        colorName: variant.color_name,
        colorHex: variant.color_hex,
        sizeLabel: variant.size_label,
        sort: variant.sort,
        active: variant.active,
      };
      await adminProductRepository.updateVariant(variantId, changes, tx);

      if (
        body.active === false &&
        variant.active &&
        product.status === "active" &&
        (await adminProductRepository.countActiveVariants(product.id, tx)) === 0
      ) {
        throw new ApiError("conflict", {
          message: "A product on sale needs at least one active variant. Switch it to draft first.",
        });
      }

      const after = (await adminProductRepository.findVariant(variantId, tx))!;
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "variants.update",
          entityType: "variant",
          entityId: variantId,
          before,
          after: {
            sku: after.sku,
            colorName: after.color_name,
            colorHex: after.color_hex,
            sizeLabel: after.size_label,
            sort: after.sort,
            active: after.active,
          },
        },
        ctx.requestId,
      );
      return variant.product_id;
    });
  } catch (error) {
    const conflict = variantConflict(error);
    if (conflict) throw conflict;
    throw error;
  }
  refreshCatalogCache();
  return getProduct(productId);
}

// ------------------------------------------------------------------ sections

/** Replaces the detail cards of the product page (Description, Material, ...) with exactly these, in this order. */
export async function setSections(
  ctx: AdminContext,
  id: string,
  sections: { title: string; body: string }[],
): Promise<ProductDto> {
  await withTransaction(async (tx) => {
    const current = await adminProductRepository.lockById(id, tx);
    if (!current) throw notFound();
    if (current.deleted_at) {
      throw new ApiError("conflict", {
        message: "This product was deleted. Restore it before changing it.",
      });
    }
    const before = await adminProductRepository.listSections(id, tx);
    await adminProductRepository.setSections(id, sections, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "products.sections",
        entityType: "product",
        entityId: id,
        before: { sections: before },
        after: { sections },
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
  return getProduct(id);
}

// -------------------------------------------------------------------- photos

/** Where the shop page finds an uploaded photo (see the public media route). */
const PHOTO_URL_PREFIX = "/api/v1/media/";

/** The storage key behind a photo address, or null for the sample photos that ship with the site (/images/...). */
function uploadedKey(src: string): string | null {
  return src.startsWith(PHOTO_URL_PREFIX)
    ? src.slice(PHOTO_URL_PREFIX.length)
    : null;
}

async function removeFileQuietly(key: string | null): Promise<void> {
  if (!key) return;
  try {
    await getStorage().delete(key);
  } catch (error) {
    // The database no longer points at it; a leftover file is harmless.
    logger.warn("could not delete a product photo", {
      error: serializeError(error),
    });
  }
}

/** Locks the product and refuses to change a deleted one. */
async function lockEditable(id: string, tx: Tx) {
  const current = await adminProductRepository.lockById(id, tx);
  if (!current) throw notFound();
  if (current.deleted_at) {
    throw new ApiError("conflict", {
      message: "This product was deleted. Restore it before changing it.",
    });
  }
  return current;
}

const imageNotFound = () =>
  new ApiError("not_found", { message: "This photo does not exist." });

/**
 * Adds an uploaded picture as the product's last photo. The picture is
 * checked and shrunk to WebP before anything is saved; its description starts
 * as the product name and is changed with updateImage.
 */
export async function addImage(
  ctx: AdminContext,
  id: string,
  upload: Buffer,
): Promise<ProductDto> {
  const processed = await processProductPhoto(upload);
  const key = `products/${randomBytes(16).toString("hex")}.webp`;
  await getStorage().put(key, processed);

  try {
    await withTransaction(async (tx) => {
      const product = await lockEditable(id, tx);
      if (
        (await adminProductRepository.countImages(id, tx)) >=
        MAX_PHOTOS_PER_PRODUCT
      ) {
        throw new ApiError("conflict", {
          message: `A product can have at most ${MAX_PHOTOS_PER_PRODUCT} photos. Remove one first.`,
        });
      }
      const image = await adminProductRepository.insertImage(
        { productId: id, src: `${PHOTO_URL_PREFIX}${key}`, alt: product.name },
        tx,
      );
      await recordAudit(
        tx,
        ctx.actor,
        {
          action: "products.image_add",
          entityType: "product",
          entityId: id,
          after: { imageId: image.id, src: image.src, sort: image.sort },
        },
        ctx.requestId,
      );
    });
  } catch (error) {
    await removeFileQuietly(key);
    throw error;
  }
  refreshCatalogCache();
  return getProduct(id);
}

export async function updateImage(
  ctx: AdminContext,
  id: string,
  imageId: string,
  changes: UpdateImageBody,
): Promise<ProductDto> {
  await withTransaction(async (tx) => {
    await lockEditable(id, tx);
    const before = await adminProductRepository.findImage(id, imageId, tx);
    if (!before) throw imageNotFound();
    await adminProductRepository.updateImage(imageId, changes, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "products.image_update",
        entityType: "product",
        entityId: id,
        before: { imageId, alt: before.alt, position: before.position },
        after: {
          imageId,
          alt: changes.alt ?? before.alt,
          position:
            changes.position === undefined ? before.position : changes.position,
        },
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
  return getProduct(id);
}

/** The photos in a new order. `ids` must be every photo of the product, once each; the first is the main photo. */
export async function reorderImages(
  ctx: AdminContext,
  id: string,
  ids: string[],
): Promise<ProductDto> {
  await withTransaction(async (tx) => {
    await lockEditable(id, tx);
    const current = await adminProductRepository.listImages(id, tx);
    const currentIds = current.map((image) => image.id);
    if (
      ids.length !== currentIds.length ||
      !ids.every((imageId) => currentIds.includes(imageId))
    ) {
      throw new ApiError("validation_failed", {
        message: "List every photo of this product, once each.",
        fields: { ids: "List every photo of this product, once each" },
      });
    }
    await adminProductRepository.setImageOrder(ids, tx);
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "products.images_reorder",
        entityType: "product",
        entityId: id,
        before: { ids: currentIds },
        after: { ids },
      },
      ctx.requestId,
    );
  });
  refreshCatalogCache();
  return getProduct(id);
}

export async function removeImage(
  ctx: AdminContext,
  id: string,
  imageId: string,
): Promise<ProductDto> {
  let removedKey: string | null = null;
  await withTransaction(async (tx) => {
    await lockEditable(id, tx);
    const image = await adminProductRepository.findImage(id, imageId, tx);
    if (!image) throw imageNotFound();
    await adminProductRepository.deleteImage(imageId, tx);
    // Close the gap so the photos stay numbered 0, 1, 2...
    const rest = await adminProductRepository.listImages(id, tx);
    await adminProductRepository.setImageOrder(
      rest.map((item) => item.id),
      tx,
    );
    await recordAudit(
      tx,
      ctx.actor,
      {
        action: "products.image_remove",
        entityType: "product",
        entityId: id,
        before: { imageId, src: image.src, alt: image.alt },
      },
      ctx.requestId,
    );
    removedKey = uploadedKey(image.src);
  });
  await removeFileQuietly(removedKey);
  refreshCatalogCache();
  return getProduct(id);
}
