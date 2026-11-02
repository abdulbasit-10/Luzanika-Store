import "server-only";

import { z } from "zod";

import {
  idSchema,
  noControl,
  slugSchema,
  text,
} from "@/server/validation/admin-catalog-schemas";
import { pageQuery } from "@/server/validation/admin-order-schemas";

const markets = ["PK", "DE"] as const;
const AVAILABILITY = ["in-stock", "pre-order", "fitting-ready"] as const;
const MAX_UNITS = 1_000_000;

const sortNumber = z.number().int().min(-100_000).max(100_000);

const notes = z
  .array(text("note", 40))
  .max(10, "At most 10 notes")
  .refine((items) => new Set(items).size === items.length, "List each note once");

const badge = z
  .object({
    label: text("badge text", 30),
    tone: z.enum(["dark", "light"]),
  })
  .strict();

const productFields = {
  name: text("name", 160),
  slug: slugSchema,
  tagline: z.string().trim().min(1).max(300, "Keep it under 300 characters").regex(noControl).nullable(),
  categoryId: idSchema.nullable(),
  subcategoryId: idSchema.nullable(),
  collectionId: idSchema.nullable(),
  availability: z.enum(AVAILABILITY).nullable(),
  badge: badge.nullable(),
  isNew: z.boolean(),
  notes,
  hasSizeGuide: z.boolean(),
  listed: z.boolean(),
  sort: sortNumber,
};

/**
 * A new product always starts as a draft (it has no price or stock yet) and
 * is switched on with PATCH once it is ready. Leave the slug out to make one from the name.
 */
export const createProductSchema = z
  .object({
    name: productFields.name,
    slug: productFields.slug.optional(),
    tagline: productFields.tagline.default(null),
    categoryId: productFields.categoryId.default(null),
    subcategoryId: productFields.subcategoryId.default(null),
    collectionId: productFields.collectionId.default(null),
    availability: productFields.availability.default(null),
    badge: productFields.badge.default(null),
    isNew: productFields.isNew.default(false),
    notes: productFields.notes.default([]),
    hasSizeGuide: productFields.hasSizeGuide.default(false),
    listed: productFields.listed.default(true),
  })
  .strict();

export type CreateProductBody = z.infer<typeof createProductSchema>;

export const updateProductSchema = z
  .object({
    ...productFields,
    status: z.enum(["draft", "active", "archived"]),
  })
  .partial()
  .strict();

export type UpdateProductBody = z.infer<typeof updateProductSchema>;

export const productListQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  categoryId: idSchema.optional(),
  listed: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  /** "exclude" (default), "include" or "only" deleted products. */
  deleted: z.enum(["exclude", "include", "only"]).default("exclude"),
  ...pageQuery,
});

const money = z.number().int("Enter a whole number of paisa / cents").min(0).max(100_000_000_000);

const price = z
  .object({
    amount: money,
    /** The old price shown struck through; must be higher than `amount`. */
    compareAtAmount: money.nullable().default(null),
  })
  .strict()
  .refine(
    (value) => value.compareAtAmount === null || value.compareAtAmount > value.amount,
    { message: "The old price must be higher than the price", path: ["compareAtAmount"] },
  );

/** Prices of one product per market. A market left out is not touched; `null` removes the price (the product is then not sold there). */
export const setPricesSchema = z
  .object({
    PK: price.nullable(),
    DE: price.nullable(),
  })
  .partial()
  .strict()
  .refine((body) => markets.some((market) => body[market] !== undefined), {
    message: "Send a price for at least one market",
  });

export type SetPricesBody = z.infer<typeof setPricesSchema>;

const sku = z
  .string()
  .trim()
  .min(1, "Enter the SKU")
  .max(64, "Keep it under 64 characters")
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Use letters, digits, dots, dashes and underscores");

const colorName = text("colour name", 40);
const colorHex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #1a2b3c");
const sizeLabel = text("size", 20);

const stockQuantity = z
  .number()
  .int("Enter a whole number")
  .min(0, "Stock cannot be negative")
  .max(MAX_UNITS);

/** A colour and its code go together: both or neither. */
function colourPair(
  body: { colorName?: string | null; colorHex?: string | null },
  ctx: z.RefinementCtx,
) {
  if ((body.colorName == null) !== (body.colorHex == null)) {
    ctx.addIssue({
      code: "custom",
      path: ["colorHex"],
      message: "Give both the colour name and its code, or neither",
    });
  }
}

export const createVariantSchema = z
  .object({
    sku,
    colorName: colorName.nullable().default(null),
    colorHex: colorHex.nullable().default(null),
    sizeLabel: sizeLabel.nullable().default(null),
    sort: sortNumber.optional(),
    active: z.boolean().default(true),
    /** Units on the shelf to start with, per market. */
    stock: z
      .object({ PK: stockQuantity, DE: stockQuantity })
      .partial()
      .strict()
      .default({}),
  })
  .strict()
  .superRefine(colourPair);

export type CreateVariantBody = z.infer<typeof createVariantSchema>;

export const updateVariantSchema = z
  .object({
    sku,
    colorName: colorName.nullable(),
    colorHex: colorHex.nullable(),
    sizeLabel: sizeLabel.nullable(),
    sort: sortNumber,
    active: z.boolean(),
  })
  .partial()
  .strict();

export type UpdateVariantBody = z.infer<typeof updateVariantSchema>;

export const setSectionsSchema = z
  .object({
    sections: z
      .array(
        z
          .object({
            title: text("title", 80),
            body: text("text", 4000),
          })
          .strict(),
      )
      .max(12, "At most 12 sections"),
  })
  .strict();
