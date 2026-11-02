import { z } from "zod";

import {
  GENDER_OPTIONS,
  type Gender,
} from "@/features/account/profile-options";
import { email, firstName, lastName } from "@/features/auth/auth-schema";

const genders = GENDER_OPTIONS.map((option) => option.value) as [
  Gender,
  ...Gender[],
];

const MIN_BIRTH_YEAR = 1900;

export const personalSchema = z.object({
  firstName,
  lastName,
  gender: z.enum(genders, "Please choose an option").or(z.literal("")),
  dateOfBirth: z
    .string()
    .refine(
      (value) =>
        value === "" ||
        (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(Date.parse(value)) &&
          Number(value.slice(0, 4)) >= MIN_BIRTH_YEAR),
      "Please enter a valid date",
    )
    .refine(
      (value) => value === "" || new Date(value) <= new Date(),
      "Date of birth can't be in the future",
    ),
});

export type PersonalFormValues = z.infer<typeof personalSchema>;

export const contactSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[\d\s()-]{6,20})?$/, "Please enter a valid phone number"),
  email,
});

export type ContactFormValues = z.infer<typeof contactSchema>;
