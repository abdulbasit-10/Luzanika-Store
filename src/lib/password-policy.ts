import { z } from "zod";

import { isCommonPassword } from "./common-passwords";

/** Change the minimum here and the website forms and the server follow. */
export const PASSWORD_MIN_LENGTH = 6;
/** bcrypt only reads the first 72 bytes, so longer passwords would be silently cut. We refuse them instead. */
export const PASSWORD_MAX_BYTES = 72;

export const PASSWORD_MESSAGES = {
  required: "Please enter a password",
  tooShort: `Use at least ${PASSWORD_MIN_LENGTH} characters`,
  tooLong: "Please use a shorter password (72 bytes at most)",
  common: "This password is too common. Please choose another one",
  sameAsEmail: "Your password cannot be the same as your email",
} as const;

export type PasswordProblem = keyof typeof PASSWORD_MESSAGES;

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * Returns the first problem with a new password, or null if it is acceptable.
 * Length is counted in characters for the minimum and in bytes for the maximum.
 * There are deliberately no "must contain a symbol" rules: length and the
 * common-password check protect better and annoy people less.
 */
export function findPasswordProblem(
  password: string,
  email?: string,
): PasswordProblem | null {
  if (password.length === 0) return "required";
  if ([...password].length < PASSWORD_MIN_LENGTH) return "tooShort";
  if (byteLength(password) > PASSWORD_MAX_BYTES) return "tooLong";
  if (isCommonPassword(password)) return "common";
  if (email && password.toLowerCase() === email.trim().toLowerCase()) {
    return "sameAsEmail";
  }
  return null;
}

/** zod rule for a NEW password (sign up, reset, change). Login must not use this: old accounts may differ. */
export const newPasswordSchema = z.string().superRefine((password, ctx) => {
  const problem = findPasswordProblem(password);
  if (problem)
    ctx.addIssue({ code: "custom", message: PASSWORD_MESSAGES[problem] });
});
