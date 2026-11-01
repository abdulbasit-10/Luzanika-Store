import "server-only";

import { randomBytes } from "node:crypto";

import { withTransaction } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import { logger, serializeError } from "@/server/logger";
import { processAvatar } from "@/server/media/avatar-image";
import {
  customerRepository,
  EmailTakenError,
  type CustomerRecord,
  type ProfileColumns,
} from "@/server/repositories/customer-repository";
import { sessionRepository } from "@/server/repositories/session-repository";
import { addressRepository } from "@/server/repositories/address-repository";
import { cartRepository } from "@/server/repositories/cart-repository";
import { cancelOpenOrders } from "@/server/services/order-service";
import { wishlistRepository } from "@/server/repositories/wishlist-repository";
import { tokenRepository } from "@/server/repositories/token-repository";
import { verifyPassword } from "@/server/security/password";
import { getStorage } from "@/server/storage";
import type { UpdateProfileBody } from "@/server/validation/account-schemas";

function wrongPassword(field: string): ApiError {
  return new ApiError("validation_failed", {
    fields: { [field]: "Your current password is incorrect" },
  });
}

/** True when the request would change the account's email address. */
export function isEmailChange(
  customer: CustomerRecord,
  body: UpdateProfileBody,
): boolean {
  return body.email !== undefined && body.email !== customer.email;
}

/**
 * Saves the profile fields that were sent. Changing the email needs the
 * current password, because the email is where password-reset links go: a
 * stolen session must not be able to move the account to someone else's inbox.
 */
export async function updateProfile(input: {
  customer: CustomerRecord;
  sessionId: string;
  body: UpdateProfileBody;
}): Promise<CustomerRecord> {
  const { customer, sessionId, body } = input;
  const changingEmail = isEmailChange(customer, body);

  if (changingEmail) {
    if (!body.currentPassword) {
      throw new ApiError("validation_failed", {
        fields: {
          currentPassword:
            "Please enter your current password to change your email",
        },
      });
    }
    if (!(await verifyPassword(body.currentPassword, customer.passwordHash))) {
      throw wrongPassword("currentPassword");
    }
  }

  const changes: ProfileColumns = {};
  if (body.firstName !== undefined) changes.firstName = body.firstName;
  if (body.lastName !== undefined) changes.lastName = body.lastName;
  if (body.phone !== undefined) changes.phone = body.phone;
  if (body.gender !== undefined) changes.gender = body.gender;
  if (body.dateOfBirth !== undefined) changes.dateOfBirth = body.dateOfBirth;
  if (body.language !== undefined) changes.language = body.language;
  if (changingEmail) changes.email = body.email;

  if (Object.keys(changes).length === 0) return customer;

  try {
    return await withTransaction(async (tx) => {
      const updated = await customerRepository.updateProfile(
        customer.id,
        changes,
        tx,
      );
      if (changingEmail) {
        // Links already sent to the old address must stop working, and other
        // devices sign in again, so the person who just proved the password is
        // the only one still in.
        await tokenRepository.cancelUnused(customer.id, "reset_password", tx);
        await tokenRepository.cancelUnused(customer.id, "verify_email", tx);
        await sessionRepository.revokeAllForCustomer(
          customer.id,
          new Date(),
          sessionId,
          tx,
        );
      }
      return updated;
    });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      throw new ApiError("email_taken", {
        fields: { email: "An account with this email already exists" },
      });
    }
    throw error;
  }
}

async function removeFileQuietly(key: string | null): Promise<void> {
  if (!key) return;
  try {
    await getStorage().delete(key);
  } catch (error) {
    // The database no longer points at it; a leftover file is harmless, so this must not fail the request.
    logger.warn("could not delete a replaced file", {
      error: serializeError(error),
    });
  }
}

/** Sets the customer's profile photo from an uploaded picture. */
export async function setAvatar(
  customer: CustomerRecord,
  upload: Buffer,
): Promise<CustomerRecord> {
  const processed = await processAvatar(upload);
  const key = `avatars/${randomBytes(16).toString("hex")}.webp`;

  const storage = getStorage();
  await storage.put(key, processed);

  try {
    const { previousKey, customer: updated } =
      await customerRepository.replaceAvatarKey(customer.id, key);
    await removeFileQuietly(previousKey);
    return updated;
  } catch (error) {
    await removeFileQuietly(key);
    throw error;
  }
}

export async function removeAvatar(
  customer: CustomerRecord,
): Promise<CustomerRecord> {
  const { previousKey, customer: updated } =
    await customerRepository.replaceAvatarKey(customer.id, null);
  await removeFileQuietly(previousKey);
  return updated;
}

/** The customer's own photo bytes, or null when there is none. */
export async function getAvatar(customer: CustomerRecord) {
  if (!customer.avatarKey) return null;
  return getStorage().get(customer.avatarKey);
}

/**
 * Deletes the account after the password is confirmed. The personal details
 * are wiped, every session and link is removed, and the email is freed. The
 * row itself stays so that records the law requires us to keep (orders, for
 * accounting) still point at a customer.
 */
export async function deleteAccount(input: {
  customer: CustomerRecord;
  password: string;
}): Promise<void> {
  const { customer, password } = input;
  if (!(await verifyPassword(password, customer.passwordHash))) {
    throw wrongPassword("password");
  }

  // Orders nobody has paid yet are cancelled first, so the stock they hold goes back on sale.
  await cancelOpenOrders(customer.id);

  await withTransaction(async (tx) => {
    await customerRepository.anonymise(customer.id, new Date(), tx);
    await sessionRepository.deleteAllForCustomer(customer.id, tx);
    await tokenRepository.deleteAllForCustomer(customer.id, tx);
    // A saved address book is personal data; orders keep their own copy of where they shipped.
    await addressRepository.deleteAllForCustomer(customer.id, tx);
    await cartRepository.deleteAllForCustomer(customer.id, tx);
    await wishlistRepository.deleteAllForCustomer(customer.id, tx);
  });

  await removeFileQuietly(customer.avatarKey);
}
