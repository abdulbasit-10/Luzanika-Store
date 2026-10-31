import { AuthError } from "@/features/auth/auth-service";

const GENERIC = "Something went wrong. Please try again.";
const RATE_LIMITED =
  "Too many attempts. Please wait a few minutes and try again.";

export function loginFailureMessage(error: unknown): string {
  if (error instanceof AuthError) {
    if (error.code === "invalid_credentials") {
      return "Incorrect email or password.";
    }
    if (error.code === "rate_limited") return RATE_LIMITED;
  }
  return GENERIC;
}

/** Message for a failed sign up. Problems tied to one field are shown on the field instead (returns null). */
export function signupFailureMessage(error: unknown): string | null {
  if (error instanceof AuthError) {
    if (error.code === "rate_limited") return RATE_LIMITED;
    if (error.code === "email_taken" || error.code === "validation_failed") {
      return null;
    }
  }
  return GENERIC;
}

export function resetFailureMessage(error: unknown): string | null {
  if (error instanceof AuthError) {
    if (error.code === "invalid_reset_link") {
      return "This reset link is invalid or has expired. Please request a new one.";
    }
    if (error.code === "rate_limited") return RATE_LIMITED;
    if (error.code === "validation_failed") return null;
  }
  return GENERIC;
}

export function forgotFailureMessage(error: unknown): string | null {
  if (error instanceof AuthError) {
    if (error.code === "rate_limited") return RATE_LIMITED;
    // Shown on the email field instead.
    if (error.code === "email_not_registered") return null;
  }
  return GENERIC;
}
