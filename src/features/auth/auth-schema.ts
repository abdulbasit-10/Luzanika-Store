import { z } from "zod";

const email = z.email("Please enter a valid email address");

const newPassword = z
  .string()
  .max(128, "Please use 128 characters or fewer")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
    "Use at least 8 characters, with a letter and a number",
  );

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
    firstName: z
      .string()
      .trim()
      .min(1, "Please enter your first name")
      .max(50, "Please keep your first name under 50 characters"),
    lastName: z
      .string()
      .trim()
      .min(1, "Please enter your last name")
      .max(50, "Please keep your last name under 50 characters"),
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
