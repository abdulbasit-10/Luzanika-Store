import type {
  LoginFormValues,
  ResetPasswordFormValues,
  SignupFormValues,
} from "@/features/auth/auth-schema";
import type { Gender, Language } from "@/features/account/profile-options";

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
  /** Small square photo as a data URL. The backend will store the file and return its URL. */
  avatar?: string;
}

export type AuthErrorCode =
  | "email_taken"
  | "invalid_credentials"
  | "invalid_reset_link"
  | "account_not_found";

/** What the backend will answer with when sign up or login is refused. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.name = "AuthError";
    this.code = code;
  }
}

/*
 * Mock accounts until the backend exists. They are kept in this browser only
 * (localStorage) and the password is stored as a salted hash, never as text.
 * The hash is NOT secure; the real backend hashes passwords with a proper
 * algorithm and never exposes them. Delete this block when the API is wired.
 */
const USERS_KEY = "luzanika-mock-users";

interface StoredUser extends AuthUser {
  salt: string;
  passwordHash: string;
}

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
  } catch {
    return [];
  }
}

// cyrb53, a small non-cryptographic string hash.
function mockHash(text: string) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const randomId = () => Math.random().toString(36).slice(2, 12);
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toUser(stored: StoredUser): AuthUser {
  const { salt, passwordHash, ...user } = stored;
  void salt;
  void passwordHash;
  return user;
}

/**
 * Mock of POST /auth/register. Same shape as the real call (async, takes the
 * validated values, rejects with an AuthError), so only the body changes.
 */
export async function registerUser(
  values: Omit<SignupFormValues, "confirmPassword">,
): Promise<AuthUser> {
  await wait(800);
  const users = readUsers();
  const email = normalizeEmail(values.email);

  if (users.some((user) => user.email === email)) {
    throw new AuthError("email_taken");
  }

  const salt = randomId();
  const user: StoredUser = {
    id: randomId(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email,
    salt,
    passwordHash: mockHash(salt + values.password),
  };
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  return toUser(user);
}

/** Mock of POST /auth/login. Rejects with an AuthError for a wrong email or password. */
export async function loginUser(values: LoginFormValues): Promise<AuthUser> {
  await wait(800);
  const email = normalizeEmail(values.email);
  const user = readUsers().find((item) => item.email === email);

  if (!user || user.passwordHash !== mockHash(user.salt + values.password)) {
    throw new AuthError("invalid_credentials");
  }
  return toUser(user);
}

/**
 * Mock of POST /auth/reset-password. The real call also sends the token from
 * the link in the reset email, which tells the backend whose password to
 * change; rejects with "invalid_reset_link" when the token is wrong or
 * expired. Without a backend there is no email, so the mock changes the
 * password of the most recently created account.
 */
export async function resetPassword(
  values: Pick<ResetPasswordFormValues, "password">,
): Promise<void> {
  await wait(800);
  const users = readUsers();
  const target = users.at(-1);

  if (!target) throw new AuthError("invalid_reset_link");

  const salt = randomId();
  target.salt = salt;
  target.passwordHash = mockHash(salt + values.password);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
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

/**
 * Mock of PATCH /account (the backend knows who is signed in from the session
 * cookie, so it will not take the id). Returns the updated user and rejects
 * with "email_taken" when another account already uses the new email.
 */
export async function updateProfile(
  userId: string,
  patch: ProfilePatch,
): Promise<AuthUser> {
  await wait(600);
  const users = readUsers();
  const index = users.findIndex((user) => user.id === userId);

  if (index === -1) throw new AuthError("account_not_found");

  const email = patch.email ? normalizeEmail(patch.email) : undefined;
  if (
    email &&
    users.some((user) => user.id !== userId && user.email === email)
  ) {
    throw new AuthError("email_taken");
  }

  const next: Record<string, unknown> = { ...users[index] };
  for (const [key, value] of Object.entries({ ...patch, email })) {
    if (value === undefined) continue;
    if (value === "" || value === null) delete next[key];
    else next[key] = value;
  }
  users[index] = next as unknown as StoredUser;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return toUser(users[index]);
}

/** Mock of DELETE /account. */
export async function deleteAccount(userId: string): Promise<void> {
  await wait(600);
  const users = readUsers().filter((user) => user.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** Mock of POST /auth/logout, where the backend clears the session cookie. */
export async function logoutUser(): Promise<void> {
  await wait(300);
}
