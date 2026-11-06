import { z } from "zod";

import { PAYMENT_METHODS } from "@/features/orders/payment-methods";

const required = (message: string) => z.string().trim().min(1, message);

/** What a phone number may look like (the server checks the same rule). */
export const PHONE_PATTERN = /^\+?[\d\s()-]{6,19}$/;

/** The country codes offered next to the phone number: Pakistan and Germany. */
export const PHONE_CODES = [
  { code: "+92", region: "PK" },
  { code: "+49", region: "DE" },
] as const;

/**
 * What is wrong with a number for the chosen country code, in plain words, or
 * null when it is fine. The number is the local part: "0300 4589211" for +92.
 * - +92 (Pakistan): a mobile number, 03XX XXXXXXX (10 digits after the 0 and the
 *   first one is 3), because SMS updates and the courier's call go to a mobile.
 * - +49 (Germany): 7 to 13 digits after the leading 0.
 * A number typed with its own "+" or "00" is for another country; only the
 * general rule (PHONE_PATTERN) applies to it.
 */
export function phoneProblem(phone: string, code: string): string | null {
  const typed = phone.trim();
  if (typed.startsWith("+") || typed.startsWith("00")) return null;

  const digits = typed.replace(/[\s()-]/g, "").replace(/^0/, "");
  if (code === "+92") {
    return /^3\d{9}$/.test(digits)
      ? null
      : "Enter a Pakistani mobile number, like 0300 4589211";
  }
  return /^[1-9]\d{6,12}$/.test(digits) ? null : "Enter a valid phone number";
}

/**
 * The number as it is sent with the order. A number typed with its own "+" (or
 * "00") is kept; otherwise the chosen country code is put in front and the
 * leading zero of the local number is dropped ("0300 4589211" becomes "+92 300 4589211").
 */
export function fullPhoneNumber(phone: string, code: string): string {
  const typed = phone.trim();
  if (typed.startsWith("+")) return typed;
  if (typed.startsWith("00")) return `+${typed.slice(2)}`;
  return `${code} ${typed.replace(/^0+/, "")}`;
}

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
  phoneCode: z.enum(["+92", "+49"]),
  phone: z.string().trim().regex(PHONE_PATTERN, "Enter a valid phone number"),
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

  // The country's own rule, once the number has passed the general one (no second message).
  if (PHONE_PATTERN.test(values.phone)) {
    const problem = phoneProblem(values.phone, values.phoneCode);
    if (problem) fail("phone", problem);
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
