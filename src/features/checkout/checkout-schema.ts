import { z } from "zod";

export const PAYMENT_METHODS = ["card", "paypal", "gift-card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const required = (message: string) => z.string().trim().min(1, message);

/** Luhn checksum: catches most mistyped card numbers before the provider does. */
export function passesLuhn(digits: string) {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index--) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/** "MM/YY" that is a real month and has not passed (valid through the end of that month). */
export function isUnexpired(expiry: string, now = new Date()) {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  return new Date(year, month, 1) > now;
}

const baseSchema = z.object({
  email: z.email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{6,20}$/, "Enter a valid phone number"),
  company: z.string().trim().max(120, "Keep it under 120 characters"),
  country: required("Enter your country"),
  city: required("Enter your city"),
  address: required("Enter your address"),
  zip: required("Enter your ZIP code").max(12, "Enter a valid ZIP code"),

  paymentMethod: z.enum(PAYMENT_METHODS),
  cardName: z.string().trim(),
  cardNumber: z.string(),
  cardExpiry: z.string(),
  cardCvv: z.string(),

  sameBilling: z.boolean(),
  billingCountry: z.string().trim(),
  billingCity: z.string().trim(),
  billingAddress: z.string().trim(),
  billingZip: z.string().trim().max(12, "Enter a valid ZIP code"),

  acceptTerms: z.boolean(),
});

export type CheckoutFormValues = z.infer<typeof baseSchema>;

/** The card and billing fields only matter for some choices, so they are checked here. */
export const checkoutSchema = baseSchema.superRefine((values, ctx) => {
  const fail = (path: keyof CheckoutFormValues, message: string) =>
    ctx.addIssue({ code: "custom", path: [path], message });

  if (values.paymentMethod === "card") {
    if (!values.cardName) fail("cardName", "Enter the name on the card");

    const digits = values.cardNumber.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19 || !passesLuhn(digits)) {
      fail("cardNumber", "Enter a valid card number");
    }

    if (!isUnexpired(values.cardExpiry)) {
      fail("cardExpiry", "Enter a valid date (MM/YY)");
    }

    if (!/^\d{3,4}$/.test(values.cardCvv)) fail("cardCvv", "Enter the CVV");
  }

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
