import { z } from "zod";

import { AdminAuthError } from "@/features/admin-auth/admin-auth-service";
import {
  findStaffPasswordProblem,
  STAFF_PASSWORD_MESSAGES,
} from "@/server/admin/staff-password";

const email = z.email("Please enter a valid email address");

export const adminLoginSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password"),
});
export type AdminLoginValues = z.infer<typeof adminLoginSchema>;

export const adminForgotPasswordSchema = z.object({ email });
export type AdminForgotPasswordValues = z.infer<
  typeof adminForgotPasswordSchema
>;

/** The same rules the server enforces for staff (at least 12 characters, not a common password). */
const newStaffPassword = z.string().superRefine((password, ctx) => {
  const problem = findStaffPasswordProblem(password);
  if (problem) {
    ctx.addIssue({ code: "custom", message: STAFF_PASSWORD_MESSAGES[problem] });
  }
});

export const adminNewPasswordSchema = z
  .object({
    password: newStaffPassword,
    confirmPassword: z.string().min(1, "Please re-enter your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type AdminNewPasswordValues = z.infer<typeof adminNewPasswordSchema>;

/** The 6 digits from the authenticator app (spaces are allowed while typing). */
export const authenticatorCodeSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your app"));

/** A recovery code as it was shown (letters, digits and dashes). */
export const recoveryCodeSchema = z
  .string()
  .trim()
  .min(6, "Enter one of your recovery codes")
  .max(30, "That recovery code is too long");

/** Plain words for each way a sign-in step can fail. Problems tied to one field are shown on the field instead (null). */
export function adminFailureMessage(
  error: unknown,
  codes: { invalidCredentials?: string } = {},
): string | null {
  if (error instanceof AdminAuthError) {
    const { code } = error;
    if (code === "invalid_credentials") {
      return codes.invalidCredentials ?? "Incorrect email or password.";
    }
    if (code === "rate_limited") {
      return "Too many attempts. Please wait a few minutes and try again.";
    }
    if (code === "invalid_reset_link") {
      return "This link is invalid or has expired.";
    }
    if (code === "unauthenticated" || code === "two_factor_required") {
      return "Your sign-in timed out. Please sign in again.";
    }
    if (code === "validation_failed") return null;
  }
  return "Something went wrong. Please try again.";
}
