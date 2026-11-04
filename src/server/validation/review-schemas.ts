import "server-only";

import { z } from "zod";

// Control characters other than line breaks and tabs have no place in a review and can corrupt emails and logs.
const BAD_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const title = z
  .string()
  .trim()
  .max(80, "Please keep the title under 80 characters")
  .refine((value) => !BAD_CONTROL.test(value), "Please enter a valid title")
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const body = z
  .string()
  .trim()
  .min(10, "Please write at least 10 characters")
  .max(2000, "Please keep your review under 2000 characters")
  .refine((value) => !BAD_CONTROL.test(value), "Please enter a valid review");

/** What a customer sends to write or change a review. */
export const reviewBodySchema = z
  .object({
    rating: z
      .number()
      .int("Please choose 1 to 5 stars")
      .min(1, "Please choose 1 to 5 stars")
      .max(5, "Please choose 1 to 5 stars"),
    title,
    body,
  })
  .strict();

export type ReviewBody = z.infer<typeof reviewBodySchema>;

export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const adminReviewListQuerySchema = z.object({
  status: z.enum(["published", "hidden"]).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  productId: z.uuid().optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/** Why staff hide a review: kept in the audit log. */
export const hideReviewSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(1, "Please give a reason")
      .max(300, "Keep it under 300 characters")
      .regex(/^[^\p{Cc}]+$/u, "Please enter a valid reason"),
  })
  .strict();

/** The timing of the home page "Special offers" row. */
export const offerSchema = z
  .object({
    /** An ISO date and time, or null for no countdown. */
    endsAt: z.iso.datetime({ offset: true }).nullable(),
    headline: z
      .string()
      .trim()
      .max(80, "Keep it under 80 characters")
      .regex(/^[^\p{Cc}]*$/u, "Please enter a valid headline")
      .transform((value) => (value === "" ? null : value))
      .nullable(),
  })
  .strict();
