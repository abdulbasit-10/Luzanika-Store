import "server-only";

import { z } from "zod";

const noControl = /^[^\p{Cc}]+$/u;

const name = z
  .string()
  .trim()
  .min(1, "Please give the discount a name")
  .max(80, "Keep the name under 80 characters")
  .regex(noControl, "Please enter a valid name");

const percent = z
  .number()
  .int("Enter a whole percent, like 20")
  .min(1, "Enter a percent from 1 to 90")
  .max(90, "Enter a percent from 1 to 90");

const markets = z
  .array(z.enum(["PK", "DE"]))
  .min(1, "Choose at least one market")
  .max(2)
  .refine(
    (list) => new Set(list).size === list.length,
    "Choose each market once",
  );

const moment = z.iso
  .datetime({ offset: true, message: "Enter a valid date and time" })
  .nullable();

const productIds = z
  .array(z.uuid())
  .min(1, "Choose at least one product")
  .max(500, "Choose at most 500 products")
  .refine(
    (list) => new Set(list).size === list.length,
    "A product was chosen twice",
  );

/** A new discount. Dates are optional: no start means "now", no end means "until switched off". */
export const createDiscountSchema = z
  .object({
    name,
    percent,
    markets,
    startsAt: moment.default(null),
    endsAt: moment.default(null),
    active: z.boolean().default(true),
    productIds,
  })
  .strict();

export type CreateDiscountBody = z.infer<typeof createDiscountSchema>;

/** Changes only the fields that are sent. */
export const updateDiscountSchema = z
  .object({
    name: name.optional(),
    percent: percent.optional(),
    markets: markets.optional(),
    startsAt: moment.optional(),
    endsAt: moment.optional(),
    active: z.boolean().optional(),
    productIds: productIds.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, "Nothing to change");

export type UpdateDiscountBody = z.infer<typeof updateDiscountSchema>;

export const adminDiscountListQuerySchema = z.object({
  status: z.enum(["active", "scheduled", "ended", "off"]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const discountProductQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
});
