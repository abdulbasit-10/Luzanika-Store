import "server-only";

import { UniqueConstraintError } from "sequelize";

import {
  Customer,
  ensureModels,
  type CustomerStatus,
} from "@/server/db/models";
import type { Tx } from "@/server/db/transaction";

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
};
