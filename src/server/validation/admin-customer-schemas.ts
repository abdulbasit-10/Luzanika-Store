import "server-only";

import { z } from "zod";

import { pageQuery } from "@/server/validation/admin-order-schemas";

const noControl = /^[^\p{Cc}]+$/u;

export const customerListQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["active", "blocked", "anonymised"]).optional(),
  ...pageQuery,
});

/** Why the customer is being blocked: kept in the audit log. */
export const blockCustomerSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(1, "Please give a reason")
      .max(300, "Keep it under 300 characters")
      .regex(noControl, "Please enter a valid reason"),
  })
  .strict();

export const unblockCustomerSchema = z
  .object({
    note: z
      .string()
      .trim()
      .min(1)
      .max(300, "Keep it under 300 characters")
      .regex(noControl, "Please enter a valid note")
      .optional(),
  })
  .strict();
