import "server-only";

import { z } from "zod";

import { dateParam, pageQuery } from "@/server/validation/admin-order-schemas";

const market = z.enum(["PK", "DE"]);

export const stockListQuerySchema = z.object({
  market: market.optional(),
  productId: z.uuid().optional(),
  search: z.string().trim().min(1).max(100).optional(),
  /** "true" to show only what is at or below its low-stock threshold. */
  lowOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  ...pageQuery,
});

export const movementListQuerySchema = z.object({
  variantId: z.uuid().optional(),
  market: market.optional(),
  reason: z
    .enum(["initial_import", "adjustment", "sale", "return", "correction"])
    .optional(),
  from: dateParam("start", false).optional(),
  to: dateParam("end", true).optional(),
  ...pageQuery,
});

const MAX_UNITS = 1_000_000;

const note = z
  .string()
  .trim()
  .max(200, "Keep it under 200 characters")
  .regex(/^[^\p{Cc}]*$/u, "Please enter a valid note");

/**
 * Either `delta` (add or remove that many) or `setTo` (the shelf holds exactly
 * that many now), not both. A correction (fixing a counting mistake) needs a note.
 */
export const adjustStockSchema = z
  .object({
    variantId: z.uuid(),
    market,
    delta: z
      .number()
      .int("Enter a whole number")
      .min(-MAX_UNITS)
      .max(MAX_UNITS)
      .optional(),
    setTo: z
      .number()
      .int("Enter a whole number")
      .min(0, "Stock cannot be negative")
      .max(MAX_UNITS)
      .optional(),
    reason: z.enum(["adjustment", "correction"]).default("adjustment"),
    note: note.optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    if ((body.delta === undefined) === (body.setTo === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["delta"],
        message: "Send either delta or setTo",
      });
    }
    if (body.reason === "correction" && !body.note) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message: "Please say what was wrong",
      });
    }
  })
  .transform((body) => ({ ...body, note: body.note ? body.note : null }));

export const thresholdSchema = z
  .object({
    variantId: z.uuid(),
    market,
    lowStockThreshold: z
      .number()
      .int("Enter a whole number")
      .min(0)
      .max(100_000),
  })
  .strict();
