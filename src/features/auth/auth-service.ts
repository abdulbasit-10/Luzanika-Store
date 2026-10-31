import type { Gender, Language } from "@/features/account/profile-options";
import type {
  LoginFormValues,
  SignupFormValues,
} from "@/features/auth/auth-schema";
import { ApiError, apiGet, apiPost } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: Gender;
  /** ISO date, e.g. "2000-06-06". */
  dateOfBirth?: string;
  language?: Language;
  /** Small square photo as a data URL. Photo upload is not connected to the backend yet. */
  avatar?: string;
}

/** What the API's `user` looks like (see toUserDto on the server). */
interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  language?: string;
}

export type AuthErrorCode =
  | "email_taken"
  | "email_not_registered"
  | "invalid_credentials"
  | "invalid_reset_link"
  | "rate_limited"
  | "validation_failed"
  | "account_not_found"
  | "not_available";

const KNOWN_CODES: ReadonlySet<string> = new Set<AuthErrorCode>([
  "email_taken",
  "email_not_registered",
  "invalid_credentials",
  "invalid_reset_link",
  "rate_limited",
  "validation_failed",
]);

/** A refusal the page can explain to the visitor, with per-field messages when the API gave them. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly fields: Record<string, string> | null;

  constructor(
    code: AuthErrorCode,
    fields: Record<string, string> | null = null,
  ) {
    super(code);
    this.name = "AuthError";
    this.code = code;
    this.fields = fields;
  }
}

/** Turns the API's known error codes into AuthError; anything else (network, server) passes through. */
async function request<T>(send: () => Promise<T>): Promise<T> {
  try {
    return await send();
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code &&
      KNOWN_CODES.has(error.code)
    ) {
      throw new AuthError(error.code as AuthErrorCode, error.fields);
    }
    throw error;
  }
}

function toAuthUser(dto: UserDto): AuthUser {
  return {
    id: dto.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
    ...(dto.phone ? { phone: dto.phone } : {}),
    ...(dto.gender ? { gender: dto.gender as Gender } : {}),
    ...(dto.dateOfBirth ? { dateOfBirth: dto.dateOfBirth } : {}),
    ...(dto.language ? { language: dto.language as Language } : {}),
  };
}

/** POST /auth/register: creates the account and signs the visitor in. */
export async function registerUser(
  values: Omit<SignupFormValues, "confirmPassword">,
): Promise<AuthUser> {
  const { user } = await request(() =>
    apiPost<{ user: UserDto }>("/auth/register", values),
  );
  return toAuthUser(user);
}

/** POST /auth/login. Rejects with AuthError("invalid_credentials") for a wrong email or password. */
export async function loginUser(values: LoginFormValues): Promise<AuthUser> {
  const { user } = await request(() =>
    apiPost<{ user: UserDto }>("/auth/login", values),
  );
  return toAuthUser(user);
}

/** POST /auth/logout: ends the session on the server and clears the cookie. */
export async function logoutUser(): Promise<void> {
  await apiPost("/auth/logout");
}

/** GET /auth/me: the signed-in user, or null for a visitor. The session itself is an httpOnly cookie. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { user } = await apiGet<{ user: UserDto | null }>("/auth/me");
  return user ? toAuthUser(user) : null;
}

/** POST /auth/forgot-password: asks for a reset link. Always succeeds, whether or not the email has an account. */
export async function requestPasswordReset(email: string): Promise<void> {
  await request(() => apiPost("/auth/forgot-password", { email }));
}

/** POST /auth/reset-password: sets a new password using the token from the emailed link. */
export async function resetPassword(values: {
  token: string;
  password: string;
}): Promise<void> {
  await request(() => apiPost("/auth/reset-password", values));
}

/** Fields the account page can change. An empty value or null clears an optional field. */
export interface ProfilePatch {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: Gender | "";
  dateOfBirth?: string;
  language?: Language;
  avatar?: string | null;
}

/*
 * Saving profile changes and deleting the account are not connected to the
 * backend yet (next step). They refuse honestly instead of pretending to save.
 */
export async function updateProfile(
  userId: string,
  patch: ProfilePatch,
): Promise<AuthUser> {
  void userId;
  void patch;
  throw new AuthError("not_available");
}

export async function deleteAccount(userId: string): Promise<void> {
  void userId;
  throw new AuthError("not_available");
}
