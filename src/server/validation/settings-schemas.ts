import "server-only";

import { z } from "zod";

import { email } from "@/server/validation/auth-schemas";

const noControl = /^[^\p{Cc}]+$/u;

/** Minor units (paisa / cents): a whole number, at most 1,000,000.00. */
const fee = z
  .number()
  .int("Enter a whole number of paisa / cents")
  .min(0, "The fee cannot be negative")
  .max(100_000_000, "That fee is too large");

const social = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a name")
      .max(30, "Keep it under 30 characters")
      .regex(noControl),
    href: z
      .string()
      .trim()
      .max(200, "Keep it under 200 characters")
      .refine((value) => {
        try {
          return new URL(value).protocol === "https:";
        } catch {
          return false;
        }
      }, "Enter a full link that starts with https://"),
  })
  .strict();

const detail = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}`)
    .max(max, `Keep it under ${max} characters`)
    .regex(noControl, `Enter a valid ${label}`);

/** A wallet number or account number people type into their banking app. */
const walletNumber = z
  .string()
  .trim()
  .regex(/^\+?[\d\s()-]{6,20}$/, "Enter a valid number");

const bankDetails = z
  .object({
    bankName: detail("bank name", 80),
    accountTitle: detail("account title", 80),
    accountNumber: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9\s-]{2,39}$/,
        "Enter the account number or IBAN (letters, digits, spaces)",
      ),
  })
  .strict();

const walletDetails = z
  .object({ accountTitle: detail("account title", 80), number: walletNumber })
  .strict();

/** PATCH: only what is sent changes. Unknown fields are refused. */
export const updateSettingsSchema = z
  .object({
    shippingFee: z.object({ PK: fee, DE: fee }).partial().strict(),
    vatRateDePercent: z
      .number()
      .min(0, "The VAT rate cannot be negative")
      .max(50, "That VAT rate is too high")
      .refine(
        (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9,
        "Use at most two decimals",
      ),
    reservationMinutes: z
      .number()
      .int("Enter a whole number of minutes")
      .min(5, "At least 5 minutes")
      .max(1440, "At most 1440 minutes (one day)"),
    /** A method set to null is no longer offered at checkout; one that is left out stays as it is. */
    payments: z
      .object({
        manualHoldHours: z
          .number()
          .int("Enter a whole number of hours")
          .min(1, "At least 1 hour")
          .max(336, "At most 336 hours (two weeks)"),
        bank: bankDetails.nullable(),
        easypaisa: walletDetails.nullable(),
        jazzcash: walletDetails.nullable(),
      })
      .partial()
      .strict(),
    contact: z
      .object({
        email,
        address: z
          .string()
          .trim()
          .min(1, "Enter an address")
          .max(200)
          .regex(noControl),
        customerServiceLabel: z.string().trim().min(1).max(80).regex(noControl),
        customerServicePhone: z
          .string()
          .trim()
          .regex(/^\+?[\d\s()-]{3,30}$/, "Enter a valid phone number"),
      })
      .partial()
      .strict(),
    socials: z.array(social).max(10),
  })
  .partial()
  .strict();

export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>;
