import { findPasswordProblem, PASSWORD_MESSAGES } from "@/lib/password-policy";

/** Staff can change prices and stock, so their passwords must be longer than a customer's. */
export const STAFF_PASSWORD_MIN_LENGTH = 12;

export const STAFF_PASSWORD_MESSAGES = {
  ...PASSWORD_MESSAGES,
  tooShort: `Use at least ${STAFF_PASSWORD_MIN_LENGTH} characters`,
} as const;

export type StaffPasswordProblem = keyof typeof STAFF_PASSWORD_MESSAGES;

/** The first problem with a new staff password, or null when it is acceptable. */
export function findStaffPasswordProblem(
  password: string,
  email?: string,
): StaffPasswordProblem | null {
  const problem = findPasswordProblem(password, email);
  if (problem) return problem;
  return [...password].length < STAFF_PASSWORD_MIN_LENGTH ? "tooShort" : null;
}
