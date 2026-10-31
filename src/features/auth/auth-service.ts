import type {
  LoginFormValues,
  ResetPasswordFormValues,
  SignupFormValues,
} from "@/features/auth/auth-schema";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export type AuthErrorCode =
  "email_taken" | "invalid_credentials" | "invalid_reset_link";

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

function toUser({ id, firstName, lastName, email }: StoredUser): AuthUser {
  return { id, firstName, lastName, email };
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
