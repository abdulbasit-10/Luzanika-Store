import { ApiError, apiGet, apiPost } from "@/lib/api-client";

/** What comes after the password: draw the QR code (a new person) or type the code from the app. */
export type TwoFactorStep = "two_factor_setup" | "two_factor_verify";

export type AdminAuthErrorCode =
  | "invalid_credentials"
  | "invalid_reset_link"
  | "rate_limited"
  | "validation_failed"
  | "unauthenticated"
  | "two_factor_required"
  | "forbidden";

const KNOWN_CODES: ReadonlySet<string> = new Set<AdminAuthErrorCode>([
  "invalid_credentials",
  "invalid_reset_link",
  "rate_limited",
  "validation_failed",
  "unauthenticated",
  "two_factor_required",
  "forbidden",
]);

/** A refusal the admin pages can explain, with per-field messages when the API gave them. */
export class AdminAuthError extends Error {
  constructor(
    readonly code: AdminAuthErrorCode,
    readonly fields: Record<string, string> | null,
    /** The API's own explanation, safe to show. */
    readonly serverMessage: string | null,
  ) {
    super(code);
    this.name = "AdminAuthError";
  }
}

async function request<T>(send: () => Promise<T>): Promise<T> {
  try {
    return await send();
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code &&
      KNOWN_CODES.has(error.code)
    ) {
      throw new AdminAuthError(
        error.code as AdminAuthErrorCode,
        error.fields,
        error.message,
      );
    }
    throw error;
  }
}

export interface StaffProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
}

export type AdminSession =
  | { state: "signed_out" }
  | { state: "pending"; next: TwoFactorStep }
  | { state: "signed_in"; staff: StaffProfile; permissions: string[] };

/** GET /admin/auth/me: who is signed in, or which step of signing in is still missing. */
export async function fetchAdminSession(): Promise<AdminSession> {
  try {
    const answer = await apiGet<{
      staff: StaffProfile;
      stage: "pending" | "verified";
      next?: TwoFactorStep;
      permissions?: string[];
    }>("/admin/auth/me");
    if (answer.stage === "pending" && answer.next) {
      return { state: "pending", next: answer.next };
    }
    return {
      state: "signed_in",
      staff: answer.staff,
      permissions: answer.permissions ?? [],
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { state: "signed_out" };
    }
    throw error;
  }
}

/** POST /admin/auth/login: step one, the password. Says which second step comes next. */
export async function loginStaff(values: {
  email: string;
  password: string;
}): Promise<TwoFactorStep> {
  const { next } = await request(() =>
    apiPost<{ next: TwoFactorStep }>("/admin/auth/login", values),
  );
  return next;
}

/** POST /admin/auth/2fa/verify: the 6-digit code from the app, or one recovery code (it works once). */
export async function verifyTwoFactor(
  input: { code: string } | { recoveryCode: string },
): Promise<void> {
  await request(() => apiPost("/admin/auth/2fa/verify", input));
}

/** POST /admin/auth/2fa/setup: a new authenticator secret and the otpauth:// link to draw as a QR code. */
export async function beginTwoFactorSetup(): Promise<{
  secret: string;
  otpauthUrl: string;
}> {
  return request(() =>
    apiPost<{ secret: string; otpauthUrl: string }>("/admin/auth/2fa/setup"),
  );
}

/** POST /admin/auth/2fa/enable: confirms the first code. Finishes the sign-in; the recovery codes come back only this once. */
export async function enableTwoFactor(code: string): Promise<string[]> {
  const { recoveryCodes } = await request(() =>
    apiPost<{ recoveryCodes: string[] }>("/admin/auth/2fa/enable", { code }),
  );
  return recoveryCodes;
}

/** POST /admin/auth/forgot-password: always succeeds (the answer never says whether the address works here). */
export async function requestStaffPasswordReset(email: string): Promise<void> {
  await request(() => apiPost("/admin/auth/forgot-password", { email }));
}

/** POST /admin/auth/reset-password or /accept-invite: sets a password with the token from the emailed link. */
export async function setStaffPassword(
  kind: "reset" | "invite",
  values: { token: string; password: string },
): Promise<void> {
  await request(() =>
    apiPost(
      kind === "reset"
        ? "/admin/auth/reset-password"
        : "/admin/auth/accept-invite",
      values,
    ),
  );
}

/** POST /admin/auth/logout */
export async function logoutStaff(): Promise<void> {
  await apiPost("/admin/auth/logout");
}
