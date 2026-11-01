import "server-only";

import { z } from "zod";

const market = z.enum(["PK", "DE"]);
const variantId = z.string().uuid();
const quantity = z.number().int().min(1).max(99);

export const marketQuerySchema = z.object({ market });

export const addCartItemSchema = z
  .object({
    market,
    variantId,
    quantity: quantity.default(1),
  })
  .strict();

export const updateCartItemSchema = z
  .object({
    market,
    quantity: quantity.optional(),
    selected: z.boolean().optional(),
  })
  .strict()
  .refine(
    (body) => body.quantity !== undefined || body.selected !== undefined,
    {
      message: "Send a quantity or a selected value",
    },
  );

/** A malformed id is "not found", like someone else's id, so ids cannot be probed. */
export const variantIdSchema = variantId;

export const wishlistProductSchema = z
  .object({ productId: z.string().uuid() })
  .strict();

export const productIdSchema = z.string().uuid();

export type Market = z.infer<typeof market>;
