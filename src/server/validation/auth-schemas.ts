import "server-only";

import { z } from "zod";

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
    // Control characters have no place in a name and can corrupt logs and emails.
    .regex(/^[^\p{Cc}]+$/u, `Please enter a valid ${label}`);

// Policy (length, common passwords) is checked by the service so the message names the right field.
const passwordInput = z.string().max(1000, "Password is too long");

export const registerSchema = z
  .object({
    firstName: personName("first name"),
    lastName: personName("last name"),
    email,
    password: passwordInput,
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1, "Please enter your password").max(1000),
  })
  .strict();

export const forgotPasswordSchema = z.object({ email }).strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "This link is invalid or has expired").max(200),
    password: passwordInput,
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Please enter your current password")
      .max(1000),
    newPassword: passwordInput,
  })
  .strict();
