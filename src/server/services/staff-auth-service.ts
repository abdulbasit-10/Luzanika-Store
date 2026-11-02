import "server-only";

import { isIP } from "node:net";

import {
  can,
  isPermission,
  type Permission,
  type SuperAdminOnly,
} from "@/server/admin/permissions";
import {
  findStaffPasswordProblem,
  STAFF_PASSWORD_MESSAGES,
  type StaffPasswordProblem,
} from "@/server/admin/staff-password";
import { recordAudit } from "@/server/audit/audit";
import { getAuthEnv } from "@/server/config/auth-env";
import { getStaffEnv } from "@/server/config/staff-env";
import { withTransaction } from "@/server/db/transaction";
import { getEmailSender } from "@/server/email/email-sender";
import { staffPasswordResetEmail } from "@/server/email/templates";
import { ApiError } from "@/server/http/api-error";
import { logger, serializeError } from "@/server/logger";
import { roleRepository } from "@/server/repositories/role-repository";
import {
  staffRepository,
  type StaffRecord,
} from "@/server/repositories/staff-repository";
import { staffSessionRepository } from "@/server/repositories/staff-session-repository";
import {
  staffRecoveryCodeRepository,
  staffTokenRepository,
} from "@/server/repositories/staff-token-repository";
import { PASSWORD_MAX_BYTES } from "@/lib/password-policy";
import {
  hashPassword,
  verifyAgainstDummy,
  verifyPassword,
} from "@/server/security/password";
import { decryptSecret, encryptSecret } from "@/server/security/secret-box";
import {
  generateToken,
  hashToken,
  isWellFormedToken,
} from "@/server/security/tokens";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  normalizeRecoveryCode,
  totpUri,
  verifyTotp,
} from "@/server/security/totp";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
/** A staff session ends after this long without use... */
export const STAFF_IDLE_MS = 2 * HOUR_MS;
/** ...and never lasts longer than this in total. */
export const STAFF_ABSOLUTE_MS = 12 * HOUR_MS;
/** After the password, the authenticator code must follow within this time. */
export const STAFF_PENDING_MS = 10 * MINUTE_MS;
/** Activity is written to the database at most this often. */
const STAFF_TOUCH_INTERVAL_MS = 5 * MINUTE_MS;
export const STAFF_INVITE_HOURS = 72;
export const STAFF_RESET_MINUTES = 30;

export function normalizeStaffEmail(email: string): string {
  return email.trim().toLowerCase();
}

interface RequestMeta {
  userAgent: string | null;
  /** Visitor address as normalised by the HTTP layer; "unknown" without a trusted proxy. */
  ip: string | null;
}

/** An address the database can store, or null (for "unknown"). */
function inetOrNull(ip: string | null): string | null {
  if (!ip) return null;
  return isIP(ip.replace(/\/\d+$/, "")) !== 0 ? ip : null;
}

/** Everything a request needs to know about the signed-in staff member. */
export interface StaffPrincipal {
  staff: StaffRecord;
  sessionId: string;
  sessionCreatedAt: Date;
  /** False while the session is waiting for the authenticator code. */
  mfaVerified: boolean;
  isSuperAdmin: boolean;
  permissions: ReadonlySet<Permission>;
  /** Set when the session's expiry was just extended, so the cookie must be refreshed too. */
  renewedUntil: Date | null;
}

export function principalCan(
  principal: Pick<StaffPrincipal, "isSuperAdmin" | "permissions">,
  needed: Permission | SuperAdminOnly,
): boolean {
  return can(principal, needed);
}

function passwordProblem(
  field: string,
  problem: StaffPasswordProblem,
): ApiError {
  return new ApiError("validation_failed", {
    fields: { [field]: STAFF_PASSWORD_MESSAGES[problem] },
  });
}

function wrongCode(field = "code"): ApiError {
  return new ApiError("validation_failed", {
    fields: { [field]: "That code is not correct" },
  });
}

async function loadPermissions(staff: StaffRecord): Promise<Set<Permission>> {
  const names = await roleRepository.permissionsForStaff(staff.id);
  return new Set(names.filter(isPermission));
}

function expiryFor(createdAt: Date, now: Date): Date {
  return new Date(
    Math.min(
      now.getTime() + STAFF_IDLE_MS,
      createdAt.getTime() + STAFF_ABSOLUTE_MS,
    ),
  );
}

export interface StaffLoginResult {
  token: string;
  expiresAt: Date;
  staff: StaffRecord;
  /** What the person must do next: confirm a new authenticator, or type a code from the one they have. */
  next: "two_factor_setup" | "two_factor_verify";
}

/**
 * Step one of signing in: the password. Every failure looks the same and takes
 * the same time, so the answer never reveals whether an email belongs to staff.
 * The result is a "pending" session that can do nothing but finish 2FA.
 */
export async function login(
  input: { email: string; password: string },
  meta: RequestMeta,
): Promise<StaffLoginResult> {
  const staff = await staffRepository.findByEmail(
    normalizeStaffEmail(input.email),
  );
  const tooLong =
    new TextEncoder().encode(input.password).length > PASSWORD_MAX_BYTES;

  if (!staff || staff.status !== "active" || !staff.passwordHash || tooLong) {
    await verifyAgainstDummy(input.password);
    throw new ApiError("invalid_credentials");
  }
  if (!(await verifyPassword(input.password, staff.passwordHash))) {
    throw new ApiError("invalid_credentials");
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + STAFF_PENDING_MS);
  await staffSessionRepository.create({
    staffId: staff.id,
    tokenHash: hashToken(token),
    ip: inetOrNull(meta.ip),
    userAgent: meta.userAgent,
    expiresAt,
  });

  return {
    token,
    expiresAt,
    staff,
    next: staff.totpEnabledAt ? "two_factor_verify" : "two_factor_setup",
  };
}

/** Looks up the staff member behind a cookie value, extending a real session when it is due. */
export async function authenticate(
  token: string | undefined,
): Promise<StaffPrincipal | null> {
  if (!isWellFormedToken(token)) return null;

  const found = await staffSessionRepository.findByTokenHash(hashToken(token));
  if (!found) return null;
  const { session, staff } = found;

  const now = new Date();
  const mfaVerified = session.mfaVerifiedAt !== null;
  const age = now.getTime() - session.createdAt.getTime();

  if (session.revokedAt || staff.status !== "active") return null;
  if (session.expiresAt <= now || age >= STAFF_ABSOLUTE_MS) return null;
  if (!mfaVerified && age >= STAFF_PENDING_MS) return null;

  let renewedUntil: Date | null = null;
  if (
    mfaVerified &&
    now.getTime() - session.lastUsedAt.getTime() >= STAFF_TOUCH_INTERVAL_MS
  ) {
    renewedUntil = expiryFor(session.createdAt, now);
    await staffSessionRepository.touch(session.id, now, renewedUntil);
  }

  return {
    staff,
    sessionId: session.id,
    sessionCreatedAt: session.createdAt,
    mfaVerified,
    isSuperAdmin: staff.isSuperAdmin,
    permissions: mfaVerified ? await loadPermissions(staff) : new Set(),
    renewedUntil,
  };
}

export async function logout(token: string | undefined): Promise<void> {
  if (!isWellFormedToken(token)) return;
  await staffSessionRepository.revokeByTokenHash(hashToken(token), new Date());
}

function requireSecret(staff: StaffRecord): string {
  if (!staff.totpSecretEnc) throw new ApiError("conflict");
  return decryptSecret(staff.totpSecretEnc, getStaffEnv().twoFactorKey);
}

/**
 * Starts authenticator set-up for a person who has none yet: makes a new
 * secret and returns it with the link the page turns into a QR code. Asking
 * again replaces the secret, until the first code is confirmed.
 */
export async function beginTwoFactorSetup(
  principal: StaffPrincipal,
): Promise<{ secret: string; otpauthUrl: string }> {
  if (principal.staff.totpEnabledAt) {
    throw new ApiError("conflict", {
      message: "Two-factor sign-in is already set up.",
    });
  }
  const secret = generateTotpSecret();
  await staffRepository.setPendingTotp(
    principal.staff.id,
    encryptSecret(secret, getStaffEnv().twoFactorKey),
  );
  return { secret, otpauthUrl: totpUri(secret, principal.staff.email) };
}

/**
 * Confirms set-up with the first code from the authenticator. Turns the
 * pending session into a real one and returns the recovery codes, which are
 * shown only this once.
 */
export async function confirmTwoFactorSetup(
  principal: StaffPrincipal,
  code: string,
  meta: RequestMeta,
): Promise<{ recoveryCodes: string[]; expiresAt: Date }> {
  const { staff } = principal;
  if (staff.totpEnabledAt || !staff.totpSecretEnc) {
    throw new ApiError("conflict", {
      message: "Start the set-up first.",
    });
  }

  const step = verifyTotp(requireSecret(staff), code.trim(), null);
  if (step === null) throw wrongCode();

  const recoveryCodes = generateRecoveryCodes();
  const now = new Date();
  const expiresAt = expiryFor(principal.sessionCreatedAt, now);

  await withTransaction(async (tx) => {
    await staffRepository.enableTotp(staff.id, step, tx);
    await staffRecoveryCodeRepository.replaceAll(
      staff.id,
      recoveryCodes.map(hashRecoveryCode),
      tx,
    );
    await staffSessionRepository.markVerified(
      principal.sessionId,
      now,
      expiresAt,
      tx,
    );
    await recordAudit(tx, staff, {
      action: "staff.two_factor_enabled",
      entityType: "staff",
      entityId: staff.id,
      ip: inetOrNull(meta.ip),
    });
  });
  await staffRepository.recordLogin(staff.id, now);

  return { recoveryCodes, expiresAt };
}

/** Step two of signing in: a code from the authenticator, or a recovery code. */
export async function verifyTwoFactor(
  principal: StaffPrincipal,
  input: { code?: string; recoveryCode?: string },
  meta: RequestMeta,
): Promise<{ expiresAt: Date; recoveryCodesLeft?: number }> {
  const { staff } = principal;
  if (!staff.totpEnabledAt) throw new ApiError("conflict");

  const now = new Date();
  let usedRecovery = false;

  if (input.recoveryCode !== undefined) {
    const normalized = normalizeRecoveryCode(input.recoveryCode);
    if (
      !normalized ||
      !(await staffRecoveryCodeRepository.consume(
        staff.id,
        hashRecoveryCode(normalized),
      ))
    ) {
      throw wrongCode("recoveryCode");
    }
    usedRecovery = true;
  } else {
    const step = verifyTotp(
      requireSecret(staff),
      (input.code ?? "").trim(),
      staff.totpLastStep,
    );
    // The step is claimed in the database, so the same code cannot be used by two requests.
    if (
      step === null ||
      !(await staffRepository.claimTotpStep(staff.id, step))
    ) {
      throw wrongCode();
    }
  }

  const expiresAt = expiryFor(principal.sessionCreatedAt, now);
  await withTransaction(async (tx) => {
    await staffSessionRepository.markVerified(
      principal.sessionId,
      now,
      expiresAt,
      tx,
    );
    await recordAudit(tx, staff, {
      action: usedRecovery ? "staff.login_recovery_code" : "staff.login",
      entityType: "staff",
      entityId: staff.id,
      ip: inetOrNull(meta.ip),
    });
  });
  await staffRepository.recordLogin(staff.id, now);

  return {
    expiresAt,
    ...(usedRecovery
      ? {
          recoveryCodesLeft: await staffRecoveryCodeRepository.countUnused(
            staff.id,
          ),
        }
      : {}),
  };
}

export async function changePassword(input: {
  principal: StaffPrincipal;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const { staff, sessionId } = input.principal;
  if (
    !staff.passwordHash ||
    !(await verifyPassword(input.currentPassword, staff.passwordHash))
  ) {
    throw new ApiError("validation_failed", {
      fields: { currentPassword: "Your current password is incorrect" },
    });
  }
  if (input.newPassword === input.currentPassword) {
    throw new ApiError("validation_failed", {
      fields: {
        newPassword: "Your new password must be different from the current one",
      },
    });
  }
  const problem = findStaffPasswordProblem(input.newPassword, staff.email);
  if (problem) throw passwordProblem("newPassword", problem);

  const passwordHash = await hashPassword(input.newPassword);
  await withTransaction(async (tx) => {
    await staffRepository.setPassword(staff.id, passwordHash, tx);
    await staffSessionRepository.revokeAllForStaff(
      staff.id,
      new Date(),
      sessionId,
      tx,
    );
    await recordAudit(tx, staff, {
      action: "staff.password_changed",
      entityType: "staff",
      entityId: staff.id,
    });
  });
}

/**
 * Emails a reset link when the address belongs to an active staff member.
 * Unlike for customers it says nothing either way, so the form cannot be used
 * to find out who works here.
 */
export async function requestPasswordReset(emailInput: string): Promise<void> {
  const staff = await staffRepository.findByEmail(
    normalizeStaffEmail(emailInput),
  );
  if (!staff || staff.status !== "active") return;

  const token = generateToken();
  await withTransaction((tx) =>
    staffTokenRepository.replace(
      {
        staffId: staff.id,
        type: "reset_password",
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + STAFF_RESET_MINUTES * MINUTE_MS),
      },
      tx,
    ),
  );

  const link = `${getAuthEnv().NEXT_PUBLIC_SITE_URL}/admin/reset-password?token=${token}`;
  try {
    await getEmailSender().send(
      staffPasswordResetEmail({
        to: staff.email,
        firstName: staff.firstName,
        link,
        validForMinutes: STAFF_RESET_MINUTES,
      }),
    );
  } catch (error) {
    // The answer stays the same, so a failure cannot reveal that the address exists.
    logger.error("staff password reset email failed", {
      error: serializeError(error),
    });
  }
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<void> {
  const invalidLink = () => new ApiError("invalid_reset_link");
  if (!isWellFormedToken(input.token)) throw invalidLink();

  await withTransaction(async (tx) => {
    const now = new Date();
    const link = await staffTokenRepository.findUsableForUpdate(
      hashToken(input.token),
      "reset_password",
      now,
      tx,
    );
    if (!link) throw invalidLink();

    const staff = await staffRepository.findById(link.staffId, tx);
    if (!staff || staff.status !== "active") throw invalidLink();

    // A rejected password rolls everything back, so the link stays usable for another try.
    const problem = findStaffPasswordProblem(input.newPassword, staff.email);
    if (problem) throw passwordProblem("password", problem);

    await staffRepository.setPassword(
      staff.id,
      await hashPassword(input.newPassword),
      tx,
    );
    await staffTokenRepository.markUsed(link.id, now, tx);
    await staffTokenRepository.cancelUnused(staff.id, "reset_password", tx);
    await staffSessionRepository.revokeAllForStaff(
      staff.id,
      now,
      undefined,
      tx,
    );
    await recordAudit(tx, staff, {
      action: "staff.password_reset",
      entityType: "staff",
      entityId: staff.id,
    });
  });
}

/** An invited person chooses their password. They then sign in as usual and set up their authenticator. */
export async function acceptInvite(input: {
  token: string;
  password: string;
}): Promise<void> {
  const invalidLink = () => new ApiError("invalid_reset_link");
  if (!isWellFormedToken(input.token)) throw invalidLink();

  await withTransaction(async (tx) => {
    const now = new Date();
    const link = await staffTokenRepository.findUsableForUpdate(
      hashToken(input.token),
      "invite",
      now,
      tx,
    );
    if (!link) throw invalidLink();

    const staff = await staffRepository.lockById(link.staffId, tx);
    if (!staff || staff.status !== "invited") throw invalidLink();

    const problem = findStaffPasswordProblem(input.password, staff.email);
    if (problem) throw passwordProblem("password", problem);

    await staffRepository.setPassword(
      staff.id,
      await hashPassword(input.password),
      tx,
    );
    await staffTokenRepository.markUsed(link.id, now, tx);
    await recordAudit(tx, staff, {
      action: "staff.invite_accepted",
      entityType: "staff",
      entityId: staff.id,
    });
  });
}
