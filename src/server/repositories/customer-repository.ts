import "server-only";

import { UniqueConstraintError } from "sequelize";

import {
  Customer,
  ensureModels,
  type CustomerStatus,
} from "@/server/db/models";
import { withTransaction, type Tx } from "@/server/db/transaction";

/** The profile columns a customer may change. null clears an optional one. */
export interface ProfileColumns {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  language?: string;
}

export interface CustomerRecord {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  language: string;
  avatarKey: string | null;
  status: CustomerStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface NewCustomer {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

/** Thrown when the email already belongs to another account. */
export class EmailTakenError extends Error {
  constructor() {
    super("email_taken");
    this.name = "EmailTakenError";
  }
}

export function toCustomerRecord(model: Customer): CustomerRecord {
  return {
    id: model.id,
    email: model.email,
    emailVerifiedAt: model.emailVerifiedAt,
    passwordHash: model.passwordHash,
    firstName: model.firstName,
    lastName: model.lastName,
    phone: model.phone,
    gender: model.gender,
    dateOfBirth: model.dateOfBirth,
    language: model.language,
    avatarKey: model.avatarKey,
    status: model.status,
    lastLoginAt: model.lastLoginAt,
    createdAt: model.createdAt,
  };
}

export const customerRepository = {
  async findByEmail(email: string, tx?: Tx): Promise<CustomerRecord | null> {
    ensureModels();
    const model = await Customer.findOne({ where: { email }, transaction: tx });
    return model ? toCustomerRecord(model) : null;
  },

  async findById(id: string, tx?: Tx): Promise<CustomerRecord | null> {
    ensureModels();
    const model = await Customer.findByPk(id, { transaction: tx });
    return model ? toCustomerRecord(model) : null;
  },

  async create(input: NewCustomer): Promise<CustomerRecord> {
    ensureModels();
    try {
      const model = await Customer.create({
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      });
      return toCustomerRecord(model);
    } catch (error) {
      if (error instanceof UniqueConstraintError) throw new EmailTakenError();
      throw error;
    }
  },

  async setPasswordHash(
    id: string,
    passwordHash: string,
    tx?: Tx,
  ): Promise<void> {
    ensureModels();
    await Customer.update({ passwordHash }, { where: { id }, transaction: tx });
  },

  async recordLogin(id: string, at: Date): Promise<void> {
    ensureModels();
    await Customer.update({ lastLoginAt: at }, { where: { id } });
  },

  /** Saves profile changes and returns the updated customer. null clears an optional field. */
  async updateProfile(
    id: string,
    changes: ProfileColumns,
    tx?: Tx,
  ): Promise<CustomerRecord> {
    ensureModels();
    try {
      await Customer.update(changes, { where: { id }, transaction: tx });
    } catch (error) {
      if (error instanceof UniqueConstraintError) throw new EmailTakenError();
      throw error;
    }
    const model = await Customer.findByPk(id, { transaction: tx });
    if (!model) throw new Error("Customer not found.");
    return toCustomerRecord(model);
  },

  /**
   * Points the customer at a new avatar file (or none) and returns the key of
   * the file it replaced, so the caller can delete it. The row is locked while
   * swapping, so two uploads at once cannot leave an orphaned file behind.
   */
  async replaceAvatarKey(
    id: string,
    avatarKey: string | null,
  ): Promise<{ previousKey: string | null; customer: CustomerRecord }> {
    ensureModels();
    return withTransaction(async (tx) => {
      const model = await Customer.findByPk(id, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });
      if (!model) throw new Error("Customer not found.");
      const previousKey = model.avatarKey;
      await model.update({ avatarKey }, { transaction: tx });
      return { previousKey, customer: toCustomerRecord(model) };
    });
  },

  /**
   * Account deletion. The person's details are wiped and the row is kept, so
   * records that must be retained (orders, for accounting) still point at a
   * customer. The unique email is freed by giving the row a placeholder one.
   */
  async anonymise(id: string, at: Date, tx: Tx): Promise<void> {
    ensureModels();
    await Customer.update(
      {
        email: `deleted-${id}@deleted.invalid`,
        // Not a valid bcrypt hash, so no password can ever match it.
        passwordHash: "!",
        emailVerifiedAt: null,
        firstName: "Deleted",
        lastName: "User",
        phone: null,
        gender: null,
        dateOfBirth: null,
        language: "en",
        avatarKey: null,
        lastLoginAt: null,
        status: "anonymised",
        anonymisedAt: at,
      },
      { where: { id }, transaction: tx },
    );
  },
};
