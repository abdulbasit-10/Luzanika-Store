import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name"),
  email: z.email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[\d\s()-]{6,20})?$/, "Please enter a valid phone number"),
  message: z
    .string()
    .trim()
    .min(1, "Please enter a message")
    .max(2000, "Please keep your message under 2000 characters"),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
