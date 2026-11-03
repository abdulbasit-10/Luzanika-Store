import "server-only";

import { z } from "zod";

import { PAYMENT_METHODS } from "@/server/payments/methods";
import { phone, text } from "@/server/validation/address-schemas";
import { email } from "@/server/validation/auth-schemas";

const market = z.enum(["PK", "DE"]);

const address = {
  country: text("country", 60),
  city: text("city", 60),
  address: text("street address", 160),
  zip: text("ZIP code", 12),
};

/** What the browser sends to place an order. It never contains a price: the server works the amounts out. */
export const createOrderSchema = z
  .object({
    market,
    contact: z
      .object({
        email,
        phone,
      })
      .strict(),
    shipping: z
      .object({
        fullName: text("full name", 80),
        company: z.string().trim().max(120).optional(),
        ...address,
      })
      .strict(),
    billing: z.union([z.literal("same"), z.object(address).strict()]),
    paymentMethod: z.enum(PAYMENT_METHODS),
    acceptTerms: z.literal(true, {
      error: "Please accept the Terms & Conditions to continue",
    }),
    /**
     * What the shopper saw when they pressed the button. The order is only
     * placed if the server finds exactly this, so nobody pays an amount they
     * did not see (a price or stock changed in the meantime).
     */
    expected: z
      .object({
        total: z.number().int().min(0),
        items: z
          .array(
            z
              .object({
                variantId: z.string().uuid(),
                quantity: z.number().int().min(1).max(99),
              })
              .strict(),
          )
          .min(1)
          .max(50),
      })
      .strict(),
  })
  .strict();

export type CreateOrderBody = z.infer<typeof createOrderSchema>;

/** Sent in the Idempotency-Key header: any random string made once per checkout attempt. */
export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(100)
  .regex(/^[A-Za-z0-9_.:-]+$/);

export const orderNumberSchema = z.string().regex(/^LZ-(PK|DE)-\d{6,}$/);

/**
 * The text part of a payment proof (the screenshot is the file field). A
 * transaction ID is what the bank or wallet app shows: letters, digits and a
 * few separators.
 */
export const paymentProofFieldsSchema = z
  .object({
    transactionId: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9 _./-]{3,59}$/,
        "Enter the transaction ID exactly as your bank or wallet shows it (4 to 60 letters or digits)",
      )
      .optional(),
  })
  .strict();

export const simulatePaymentSchema = z
  .object({ outcome: z.enum(["success", "failure"]) })
  .strict();

export type Market = z.infer<typeof market>;
