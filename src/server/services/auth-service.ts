import "server-only";

import {
  findPasswordProblem,
  PASSWORD_MAX_BYTES,
  PASSWORD_MESSAGES,
} from "@/lib/password-policy";
import { getAuthEnv } from "@/server/config/auth-env";
import { withTransaction } from "@/server/db/transaction";
import { getEmailSender } from "@/server/email/email-sender";
import { passwordResetEmail } from "@/server/email/templates";
import { ApiError } from "@/server/http/api-error";
import { logger, serializeError } from "@/server/logger";
import {
  customerRepository,
  EmailTakenError,
  type CustomerRecord,
} from "@/server/repositories/customer-repository";
import { sessionRepository } from "@/server/repositories/session-repository";
import { tokenRepository } from "@/server/repositories/token-repository";
import {
  hashPassword,
  needsRehash,
  verifyAgainstDummy,
  verifyPassword,
} from "@/server/security/password";
import {
  generateToken,
  hashToken,
  isWellFormedToken,
} from "@/server/security/tokens";

const DAY_MS = 24 * 60 * 60 * 1000;
/** A session ends after this long without use... */
export const SESSION_IDLE_MS = 30 * DAY_MS;
/** ...and never lasts longer than this in total, however often it is used. */
export const SESSION_ABSOLUTE_MS = 90 * DAY_MS;
/** Activity is written to the database at most this often, to keep reads cheap. */
const SESSION_TOUCH_INTERVAL_MS = 60 * 60 * 1000;
export const RESET_LINK_MINUTES = 30;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface IssuedSession {
  token: string;
  expiresAt: Date;
}

export interface AuthResult {
  customer: CustomerRecord;
  session: IssuedSession;
}

export interface AuthenticatedCustomer {
  customer: CustomerRecord;
  sessionId: string;
  /** Set when the session's expiry was just extended, so the cookie must be refreshed too. */
  renewedUntil: Date | null;
}

interface RequestMeta {
  userAgent: string | null;
}

function passwordProblem(
  field: string,
  problem: keyof typeof PASSWORD_MESSAGES,
): ApiError {
  return new ApiError("validation_failed", {
    fields: { [field]: PASSWORD_MESSAGES[problem] },
  });
}

async function issueSession(
  customerId: string,
  meta: RequestMeta,
): Promise<IssuedSession> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_IDLE_MS);
  await sessionRepository.create({
    customerId,
    tokenHash: hashToken(token),
    userAgent: meta.userAgent?.slice(0, 512) ?? null,
    expiresAt,
  });
  return { token, expiresAt };
}

export async function register(
  input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  },
  meta: RequestMeta,
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);

  const problem = findPasswordProblem(input.password, email);
  if (problem) throw passwordProblem("password", problem);

  const passwordHash = await hashPassword(input.password);

  let customer: CustomerRecord;
  try {
    customer = await customerRepository.create({
      email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      throw new ApiError("email_taken", {
        fields: { email: "An account with this email already exists" },
      });
    }
    throw error;
  }

  return { customer, session: await issueSession(customer.id, meta) };
}

export async function login(
  input: { email: string; password: string },
  meta: RequestMeta,
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const customer = await customerRepository.findByEmail(email);
  const tooLong =
    new TextEncoder().encode(input.password).length > PASSWORD_MAX_BYTES;

  // Every failure looks the same and takes the same time, so the response never reveals whether an email has an account.
  if (!customer || customer.status !== "active" || tooLong) {
    await verifyAgainstDummy(input.password);
    throw new ApiError("invalid_credentials");
  }
  if (!(await verifyPassword(input.password, customer.passwordHash))) {
    throw new ApiError("invalid_credentials");
  }

  // Upgrade old hashes to the current work factor while we have the real password.
  if (needsRehash(customer.passwordHash)) {
    try {
      await customerRepository.setPasswordHash(
        customer.id,
        await hashPassword(input.password),
      );
    } catch (error) {
      logger.warn("password rehash failed", { error: serializeError(error) });
    }
  }

  await customerRepository.recordLogin(customer.id, new Date());
  return { customer, session: await issueSession(customer.id, meta) };
}

/** Looks up the signed-in customer for a cookie value, extending the session if it is due. */
export async function authenticate(
  token: string | undefined,
): Promise<AuthenticatedCustomer | null> {
  if (!isWellFormedToken(token)) return null;

  const now = new Date();
  const found = await sessionRepository.findActiveByTokenHash(
    hashToken(token),
    now,
    new Date(now.getTime() - SESSION_ABSOLUTE_MS),
  );
  if (!found) return null;

  const { session, customer } = found;
  let renewedUntil: Date | null = null;

  if (
    now.getTime() - session.lastUsedAt.getTime() >=
    SESSION_TOUCH_INTERVAL_MS
  ) {
    const hardLimit = session.createdAt.getTime() + SESSION_ABSOLUTE_MS;
    renewedUntil = new Date(
      Math.min(now.getTime() + SESSION_IDLE_MS, hardLimit),
    );
    await sessionRepository.touch(session.id, now, renewedUntil);
  }

  return { customer, sessionId: session.id, renewedUntil };
}

export async function logout(token: string | undefined): Promise<void> {
  if (!isWellFormedToken(token)) return;
  await sessionRepository.revokeByTokenHash(hashToken(token), new Date());
}

export async function changePassword(input: {
  customerId: string;
  sessionId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const customer = await customerRepository.findById(input.customerId);
  if (!customer) throw new ApiError("unauthenticated");

  if (!(await verifyPassword(input.currentPassword, customer.passwordHash))) {
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
  const problem = findPasswordProblem(input.newPassword, customer.email);
  if (problem) throw passwordProblem("newPassword", problem);

  const passwordHash = await hashPassword(input.newPassword);
  await withTransaction(async (tx) => {
    await customerRepository.setPasswordHash(customer.id, passwordHash, tx);
    // Anyone else who was signed in (or had stolen the old password's sessions) is out now.
    await sessionRepository.revokeAllForCustomer(
      customer.id,
      new Date(),
      input.sessionId,
      tx,
    );
  });
}

/**
 * Sends a reset link if the email belongs to an active account. It always
 * finishes the same way either way, so nobody can use it to find out who has an account.
 */
export async function requestPasswordReset(emailInput: string): Promise<void> {
  const customer = await customerRepository.findByEmail(
    normalizeEmail(emailInput),
  );
  if (!customer || customer.status !== "active") return;

  const token = generateToken();
  await tokenRepository.replace({
    customerId: customer.id,
    type: "reset_password",
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_LINK_MINUTES * 60 * 1000),
  });

  const link = `${getAuthEnv().NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`;
  // Not awaited: a slow mail server must not make "email exists" answer slower than "email unknown".
  getEmailSender()
    .send(
      passwordResetEmail({
        to: customer.email,
        firstName: customer.firstName,
        link,
        validForMinutes: RESET_LINK_MINUTES,
      }),
    )
    .catch((error: unknown) => {
      logger.error("password reset email failed", {
        error: serializeError(error),
      });
    });
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<void> {
  const invalidLink = () => new ApiError("invalid_reset_link");
  if (!isWellFormedToken(input.token)) throw invalidLink();

  await withTransaction(async (tx) => {
    const now = new Date();
    const link = await tokenRepository.findUsableForUpdate(
      hashToken(input.token),
      "reset_password",
      now,
      tx,
    );
    if (!link) throw invalidLink();

    const customer = await customerRepository.findById(link.customerId, tx);
    if (!customer || customer.status !== "active") throw invalidLink();

    // A rejected password rolls everything back, so the link stays usable for another try.
    const problem = findPasswordProblem(input.newPassword, customer.email);
    if (problem) throw passwordProblem("password", problem);

    await customerRepository.setPasswordHash(
      customer.id,
      await hashPassword(input.newPassword),
      tx,
    );
    await tokenRepository.markUsed(link.id, now, tx);
    await tokenRepository.cancelUnused(customer.id, "reset_password", tx);
    await sessionRepository.revokeAllForCustomer(
      customer.id,
      now,
      undefined,
      tx,
    );
  });
}
