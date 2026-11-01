import { z } from "zod";

import {
  GENDER_OPTIONS,
  type Gender,
} from "@/features/account/profile-options";
import { email, firstName, lastName } from "@/features/auth/auth-schema";
import { isInFuture, isRealIsoDate } from "@/lib/iso-date";

const genders = GENDER_OPTIONS.map((option) => option.value) as [
  Gender,
  ...Gender[],
];

export const personalSchema = z.object({
  firstName,
  lastName,
  gender: z.enum(genders, "Please choose an option").or(z.literal("")),
  dateOfBirth: z
    .string()
    .refine(
      (value) => value === "" || isRealIsoDate(value),
      "Please enter a valid date",
    )
    .refine(
      (value) => value === "" || !isInFuture(value),
      "Date of birth can't be in the future",
    ),
});

export type PersonalFormValues = z.infer<typeof personalSchema>;

export const contactSchema = z.object({
  phone: z
    .string()
    .trim()
    // Same rule as the server: 6 to 19 digits and separators, with an optional leading "+" (20 characters at most).
    .regex(/^(\+?[\d\s()-]{6,19})?$/, "Please enter a valid phone number"),
  email,
});

export type ContactFormValues = z.infer<typeof contactSchema>;
