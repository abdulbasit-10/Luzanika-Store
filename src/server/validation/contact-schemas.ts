import "server-only";

import { z } from "zod";

import { email } from "@/server/validation/auth-schemas";

// Control characters other than line breaks and tabs have no place in a message and can corrupt emails and logs.
const BAD_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** Same rules as the contact form in the browser (features/contact/contact-schema), checked again here because the browser can be bypassed. */
export const contactSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Please enter your name")
      .max(80, "Please keep your name under 80 characters")
      .regex(/^[^\p{Cc}]+$/u, "Please enter a valid name"),
    email,
    phone: z
      .string()
      .trim()
      .regex(/^(\+?[\d\s()-]{6,20})?$/, "Please enter a valid phone number"),
    message: z
      .string()
      .trim()
      .min(1, "Please enter a message")
      .max(2000, "Please keep your message under 2000 characters")
      .refine(
        (value) => !BAD_CONTROL.test(value),
        "Please enter a valid message",
      ),
  })
  .strict();

export type ContactBody = z.infer<typeof contactSchema>;

export const adminContactListQuerySchema = z.object({
  status: z.enum(["new", "replied"]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/** What staff send to answer a message. */
export const contactReplySchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "Please write a reply")
      .max(5000, "Please keep the reply under 5000 characters")
      .refine(
        (value) => !BAD_CONTROL.test(value),
        "Please enter a valid reply",
      ),
  })
  .strict();

export type ContactReplyBody = z.infer<typeof contactReplySchema>;
