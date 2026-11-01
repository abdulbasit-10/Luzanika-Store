import type { Gender, Language } from "@/features/account/profile-options";
import type {
  LoginFormValues,
  SignupFormValues,
} from "@/features/auth/auth-schema";
import {
  ApiError,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from "@/lib/api-client";

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
  /** Address of the customer's profile photo (served only to them). */
  avatarUrl?: string;
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
  avatarUrl?: string;
}

export type AuthErrorCode =
  | "email_taken"
  | "email_not_registered"
  | "invalid_credentials"
  | "invalid_reset_link"
  | "rate_limited"
  | "validation_failed"
  | "unauthenticated"
  | "unprocessable"
  | "out_of_stock"
  | "not_found";

const KNOWN_CODES: ReadonlySet<string> = new Set<AuthErrorCode>([
  "email_taken",
  "email_not_registered",
  "invalid_credentials",
  "invalid_reset_link",
  "rate_limited",
  "validation_failed",
  "unauthenticated",
  "unprocessable",
  "out_of_stock",
  "not_found",
]);

/** A refusal the page can explain to the visitor, with per-field messages when the API gave them. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly fields: Record<string, string> | null;
  /** The API's own explanation, safe to show (e.g. "You can save up to 20 addresses"). */
  readonly serverMessage: string | null;

  constructor(
    code: AuthErrorCode,
    fields: Record<string, string> | null = null,
    serverMessage: string | null = null,
  ) {
    super(code);
    this.name = "AuthError";
    this.code = code;
    this.fields = fields;
    this.serverMessage = serverMessage;
  }
}

/** True when the request failed because the session has ended (already handled by the shared hooks). */
export function isSessionEnded(error: unknown): boolean {
  return error instanceof AuthError && error.code === "unauthenticated";
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
      throw new AuthError(
        error.code as AuthErrorCode,
        error.fields,
        error.message,
      );
    }
    throw error;
  }
}

/** For other features that talk to the signed-in API (addresses, later cart and orders): same error handling as the account calls. */
export const withKnownErrors = request;

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
    ...(dto.avatarUrl ? { avatarUrl: dto.avatarUrl } : {}),
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

/** Fields the account page can change. An empty value clears an optional field. */
export interface ProfilePatch {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: Gender | "";
  dateOfBirth?: string;
  language?: Language;
  /** Required by the server when the email changes. */
  currentPassword?: string;
}

/** PATCH /account: saves the fields that are sent and returns the updated user. */
export async function updateProfile(patch: ProfilePatch): Promise<AuthUser> {
  const { user } = await request(() =>
    apiPatch<{ user: UserDto }>("/account", patch),
  );
  return toAuthUser(user);
}

/** PUT /account/avatar: uploads a profile photo. The server resizes and cleans it. */
export async function uploadAvatar(file: File): Promise<AuthUser> {
  const form = new FormData();
  form.set("photo", file);
  const { user } = await request(() =>
    apiPut<{ user: UserDto }>("/account/avatar", form),
  );
  return toAuthUser(user);
}

/** DELETE /account/avatar */
export async function removeAvatar(): Promise<AuthUser> {
  const { user } = await request(() =>
    apiDelete<{ user: UserDto }>("/account/avatar"),
  );
  return toAuthUser(user);
}

/** DELETE /account: deletes the account after the password is confirmed. */
export async function deleteAccount(password: string): Promise<void> {
  await request(() => apiDelete("/account", { data: { password } }));
}
