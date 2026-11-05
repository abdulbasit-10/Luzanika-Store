import { z } from "zod";

import { PAYMENT_METHODS } from "@/features/orders/payment-methods";

const required = (message: string) => z.string().trim().min(1, message);

/*
 * There are no card fields here on purpose. Card details are entered in the
 * payment provider's own secure fields, so a card number never touches our
 * page's state or our server.
 */
const baseSchema = z.object({
  fullName: required("Enter the recipient's full name").max(
    80,
    "Keep it under 80 characters",
  ),
  email: z.email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{6,19}$/, "Enter a valid phone number"),
  company: z.string().trim().max(120, "Keep it under 120 characters"),
  country: required("Enter your country"),
  city: required("Enter your city"),
  address: required("Enter your address"),
  zip: required("Enter your ZIP code").max(12, "Enter a valid ZIP code"),

  paymentMethod: z.enum(PAYMENT_METHODS),

  sameBilling: z.boolean(),
  billingCountry: z.string().trim(),
  billingCity: z.string().trim(),
  billingAddress: z.string().trim(),
  billingZip: z.string().trim().max(12, "Enter a valid ZIP code"),

  acceptTerms: z.boolean(),
});

export type CheckoutFormValues = z.infer<typeof baseSchema>;

/** The billing fields only matter when billing is different from shipping, so they are checked here. */
export const checkoutSchema = baseSchema.superRefine((values, ctx) => {
  const fail = (path: keyof CheckoutFormValues, message: string) =>
    ctx.addIssue({ code: "custom", path: [path], message });

  if (!values.sameBilling) {
    if (!values.billingCountry) fail("billingCountry", "Enter your country");
    if (!values.billingCity) fail("billingCity", "Enter your city");
    if (!values.billingAddress) fail("billingAddress", "Enter your address");
    if (!values.billingZip) fail("billingZip", "Enter your ZIP code");
  }

  if (!values.acceptTerms) {
    fail("acceptTerms", "Please accept the Terms & Conditions to continue");
  }
});
