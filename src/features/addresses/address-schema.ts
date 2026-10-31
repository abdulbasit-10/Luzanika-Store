import { z } from "zod";

const required = (message: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, `Please keep it under ${max} characters`);

export const addressSchema = z.object({
  fullName: required("Please enter the full name", 80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{6,20}$/, "Please enter a valid phone number"),
  country: required("Please enter the country", 60),
  city: required("Please enter the city", 60),
  address: required("Please enter the street address", 160),
  zip: required("Please enter the ZIP code", 12),
  isDefault: z.boolean(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
