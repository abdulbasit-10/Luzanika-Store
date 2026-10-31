import { z } from "zod";

import { newPasswordSchema } from "@/lib/password-policy";

const email = z.email("Please enter a valid email address");

const personName = (label: "first name" | "last name") =>
  z
    .string()
    .trim()
    .min(1, `Please enter your ${label}`)
    .max(50, `Please keep your ${label} under 50 characters`);

export const firstName = personName("first name");
export const lastName = personName("last name");
export { email };

// The same rules the server enforces (length, common passwords), shared from one place.
const newPassword = newPasswordSchema;

const confirmPassword = z.string().min(1, "Please re-enter your password");

const passwordsMatch = {
  path: ["confirmPassword"],
  message: "Passwords do not match",
};

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    firstName,
    lastName,
    email,
    password: newPassword,
    confirmPassword,
  })
  .refine(
    (values) => values.password === values.confirmPassword,
    passwordsMatch,
  );

export type SignupFormValues = z.infer<typeof signupSchema>;

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword })
  .refine(
    (values) => values.password === values.confirmPassword,
    passwordsMatch,
  );

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const forgotPasswordSchema = z.object({ email });

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
