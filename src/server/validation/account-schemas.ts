import "server-only";

import { z } from "zod";

import { isInFuture, isRealIsoDate } from "@/lib/iso-date";

const GENDERS = ["male", "female", "prefer-not-to-say"] as const;
const LANGUAGES = ["en", "de"] as const;

const email = z
  .string()
  .max(254, "Please enter a valid email address")
  .trim()
  .toLowerCase()
  .pipe(z.email("Please enter a valid email address"));

const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Please enter your ${label}`)
    .max(50, `Please keep your ${label} under 50 characters`)
    .regex(/^[^\p{Cc}]+$/u, `Please enter a valid ${label}`);

/** Empty text means "clear this field" and is stored as null. */
const emptyToNull = <T extends z.ZodType>(schema: T) =>
  z.union([z.literal("").transform(() => null), schema]);

const phone = emptyToNull(
  z
    .string()
    .trim()
    // At most 20 characters in total, as the database allows.
    .regex(/^\+?[\d\s()-]{6,19}$/, "Please enter a valid phone number"),
);

const dateOfBirth = emptyToNull(
  z
    .string()
    .refine(isRealIsoDate, "Please enter a valid date")
    .refine(
      (value) => !isInFuture(value),
      "Date of birth can't be in the future",
    ),
);

/**
 * PATCH /account. Every field is optional; only what is sent changes. Unknown
 * fields are refused, so nobody can set their own status or other internals.
 * Changing the email needs the current password.
 */
export const updateProfileSchema = z
  .object({
    firstName: personName("first name"),
    lastName: personName("last name"),
    email,
    phone,
    gender: emptyToNull(z.enum(GENDERS, "Please choose an option")),
    dateOfBirth,
    language: z.enum(LANGUAGES, "Please choose an option"),
    currentPassword: z.string().max(1000),
  })
  .partial()
  .strict();

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;

export const deleteAccountSchema = z
  .object({
    password: z.string().min(1, "Please enter your password").max(1000),
  })
  .strict();
