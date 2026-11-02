import "server-only";

import { z } from "zod";

export const noControl = /^[^\p{Cc}]+$/u;

/** A web address part: lower-case words joined by "-", the same rule the database enforces. */
export const slugSchema = z
  .string()
  .trim()
  .min(1, "Enter a slug")
  .max(120, "Keep it under 120 characters")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Use lower-case letters, digits and single dashes, like men-casual",
  );

export const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Please enter the ${label}`)
    .max(max, `Keep the ${label} under ${max} characters`)
    .regex(noControl, `Please enter a valid ${label}`);

/**
 * A picture address: one of the site's own (a path like /images/x.jpg or one
 * uploaded through the admin), never another website, so pages cannot be made
 * to load pictures from elsewhere.
 */
export const imagePathSchema = z
  .string()
  .trim()
  .min(1, "Enter the picture address")
  .max(300, "Keep it under 300 characters")
  .regex(
    /^\/(?!\/)[A-Za-z0-9/_.\-]+$/,
    "Use a path on this site, like /images/hero.jpg",
  )
  .refine(
    (value) => !value.includes(".."),
    "Use a path on this site, like /images/hero.jpg",
  );

/** CSS object-position such as "50% 25%", keeping the subject in frame when a picture is cropped. */
export const positionSchema = z
  .string()
  .trim()
  .regex(
    /^(\d{1,3}%|left|center|right|top|bottom)( (\d{1,3}%|left|center|right|top|bottom))?$/,
    "Use a position like 50% 25%",
  );

export const idSchema = z.uuid();

const minorUnits = z
  .number()
  .int("Enter a whole number")
  .min(0)
  .max(100_000_000_000);

const categoryFields = {
  slug: slugSchema,
  label: text("name", 60),
  heroTitle: text("hero title", 100),
  title: text("page title", 120),
  description: text("description", 1000),
  heroImageSrc: imagePathSchema,
  heroImageAlt: z.string().trim().max(200, "Keep it under 200 characters"),
  heroImagePosition: positionSchema.nullable(),
  allLabel: text("label of the first pill", 60),
  filterSizes: z
    .array(text("size", 20))
    .max(20, "At most 20 sizes")
    .refine(
      (sizes) => new Set(sizes).size === sizes.length,
      "List each size once",
    ),
  priceMin: minorUnits,
  priceMax: minorUnits,
  priceStep: z.number().int().min(1).max(100_000_000_000),
  sort: z.number().int().min(-100_000).max(100_000),
};

export const createCategorySchema = z
  .object({
    ...categoryFields,
    heroImageAlt: categoryFields.heroImageAlt.default(""),
    heroImagePosition: categoryFields.heroImagePosition.default(null),
    filterSizes: categoryFields.filterSizes.default([]),
    sort: categoryFields.sort.default(0),
  })
  .strict();

export const updateCategorySchema = z.object(categoryFields).partial().strict();

export const createSubcategorySchema = z
  .object({
    slug: slugSchema,
    label: text("label", 60),
    shortLabel: text("short name", 40).nullable().default(null),
    sort: z.number().int().min(-100_000).max(100_000).default(0),
  })
  .strict();

export const updateSubcategorySchema = z
  .object({
    slug: slugSchema,
    label: text("label", 60),
    shortLabel: text("short name", 40).nullable(),
    sort: z.number().int().min(-100_000).max(100_000),
  })
  .partial()
  .strict();

export const createCollectionSchema = z
  .object({ slug: slugSchema, label: text("name", 60) })
  .strict();

export const updateCollectionSchema = z
  .object({ slug: slugSchema, label: text("name", 60) })
  .partial()
  .strict();

export const setCategoryCollectionsSchema = z
  .object({
    collectionIds: z
      .array(idSchema)
      .max(50)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "List each collection once",
      ),
  })
  .strict();

export const HOME_SECTIONS = [
  "featured",
  "new-arrivals",
  "special-offers",
] as const;
export const homeSectionSchema = z.enum(HOME_SECTIONS);

export const setHomeSectionSchema = z
  .object({
    productIds: z
      .array(idSchema)
      .max(24, "At most 24 products")
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "List each product once",
      ),
  })
  .strict();
