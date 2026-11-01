import "server-only";

import { z } from "zod";

// A name or street can contain letters, digits and punctuation in any language, but never control characters.
export const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Please enter the ${label}`)
    .max(max, `Please keep it under ${max} characters`)
    .regex(/^[^\p{Cc}]+$/u, `Please enter a valid ${label}`);

// Same rule as the profile phone number: 6 to 19 digits and separators, optional leading "+".
export const phone = z
  .string()
  .trim()
  .regex(/^\+?[\d\s()-]{6,19}$/, "Please enter a valid phone number");

const fields = {
  fullName: text("full name", 80),
  phone,
  country: text("country", 60),
  city: text("city", 60),
  address: text("street address", 160),
  zip: text("ZIP code", 12),
  isDefault: z.boolean(),
};

export const createAddressSchema = z
  .object({ ...fields, isDefault: fields.isDefault.default(false) })
  .strict();

/** PATCH: only the fields that are sent change. */
export const updateAddressSchema = z.object(fields).partial().strict();

export type CreateAddressBody = z.infer<typeof createAddressSchema>;
export type UpdateAddressBody = z.infer<typeof updateAddressSchema>;

/** Ids from the URL are checked before they reach the database, so a malformed one is simply "not found". */
export const addressIdSchema = z.uuid();
