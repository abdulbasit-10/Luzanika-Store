import "server-only";

import { z } from "zod";

const noControl = /^[^\p{Cc}]+$/u;

/**
 * A day ("2026-11-02") or a full moment ("2026-11-02T10:00:00Z"). For the end
 * of a range a plain day means that whole day, so `end` moves it to the next midnight.
 */
export function dateParam(label: string, end: boolean) {
  return z
    .string()
    .trim()
    .transform((value, ctx) => {
      const dayOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
      const parsed = new Date(dayOnly ? `${value}T00:00:00Z` : value);
      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: "custom",
          message: `Enter a valid ${label} date`,
        });
        return z.NEVER;
      }
      if (dayOnly && end) parsed.setUTCDate(parsed.getUTCDate() + 1);
      return parsed;
    });
}

const market = z.enum(["PK", "DE"]);

export const pageQuery = {
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
};

export const adminOrderListQuerySchema = z.object({
  market: market.optional(),
  status: z
    .enum([
      "waiting_payment",
      "processing",
      "in_delivery",
      "completed",
      "cancelled",
      "refunded",
    ])
    .optional(),
  paymentStatus: z
    .enum(["pending", "paid", "failed", "refunded", "partially_refunded"])
    .optional(),
  from: dateParam("start", false).optional(),
  to: dateParam("end", true).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  ...pageQuery,
});

const carrier = z
  .string()
  .trim()
  .min(1, "Enter the carrier")
  .max(80, "Keep it under 80 characters")
  .regex(noControl, "Enter a valid carrier");

const trackingNumber = z
  .string()
  .trim()
  .min(1, "Enter the tracking number")
  .max(120, "Keep it under 120 characters")
  .regex(noControl, "Enter a valid tracking number");

/** What staff can do to an order's status. Delivery details are required to ship. */
export const changeOrderStatusSchema = z.discriminatedUnion("status", [
  z
    .object({ status: z.literal("in_delivery"), carrier, trackingNumber })
    .strict(),
  z.object({ status: z.literal("completed") }).strict(),
  z
    .object({
      status: z.literal("cancelled"),
      reason: z
        .string()
        .trim()
        .min(1)
        .max(200, "Keep it under 200 characters")
        .regex(noControl, "Enter a valid reason")
        .optional(),
    })
    .strict(),
]);

export type ChangeOrderStatusBody = z.infer<typeof changeOrderStatusSchema>;

export const updateTrackingSchema = z
  .object({ carrier, trackingNumber })
  .strict();

/**
 * A refund. `amount` is in minor units (paisa / cents). With `restock` the
 * returned items go back into stock: list them in `items`, or leave `items`
 * out to put back everything that is not back yet.
 */
export const createRefundSchema = z
  .object({
    amount: z
      .number()
      .int("Enter a whole number of paisa / cents")
      .min(1, "Enter an amount above zero")
      .max(100_000_000_000, "That amount is too large"),
    reason: z
      .string()
      .trim()
      .min(1, "Please give a reason")
      .max(500, "Keep it under 500 characters")
      .regex(noControl, "Please enter a valid reason"),
    restock: z.boolean().default(false),
    items: z
      .array(
        z
          .object({
            orderItemId: z.uuid(),
            quantity: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .max(50)
      .optional(),
  })
  .strict();

export type CreateRefundBody = z.infer<typeof createRefundSchema>;
