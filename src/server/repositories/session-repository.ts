import "server-only";

import { Op } from "sequelize";

import { Customer, CustomerSession, ensureModels } from "@/server/db/models";
import type { Tx } from "@/server/db/transaction";

import { toCustomerRecord, type CustomerRecord } from "./customer-repository";

export interface SessionRecord {
  id: string;
  customerId: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

export interface NewSession {
  customerId: string;
  tokenHash: string;
  userAgent: string | null;
  expiresAt: Date;
}

function toSessionRecord(model: CustomerSession): SessionRecord {
  return {
    id: model.id,
    customerId: model.customerId,
    createdAt: model.createdAt,
    lastUsedAt: model.lastUsedAt,
    expiresAt: model.expiresAt,
  };
}

export const sessionRepository = {
  async create(input: NewSession): Promise<SessionRecord> {
    ensureModels();
    const now = new Date();
    const model = await CustomerSession.create({
      customerId: input.customerId,
      tokenHash: input.tokenHash,
      userAgent: input.userAgent,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: input.expiresAt,
    });
    return toSessionRecord(model);
  },

  /**
   * The session for this token hash, if it is still valid: not revoked, not
   * idle-expired, not past its absolute lifetime, and the customer is active.
   */
  async findActiveByTokenHash(
    tokenHash: string,
    now: Date,
    absoluteCutoff: Date,
  ): Promise<{ session: SessionRecord; customer: CustomerRecord } | null> {
    ensureModels();
    const model = await CustomerSession.findOne({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { [Op.gt]: now },
        createdAt: { [Op.gt]: absoluteCutoff },
      },
      include: [
        { model: Customer, required: true, where: { status: "active" } },
      ],
    });
    const customer = model?.get("Customer") as Customer | undefined;
    if (!model || !customer) return null;
    return {
      session: toSessionRecord(model),
      customer: toCustomerRecord(customer),
    };
  },

  async touch(id: string, lastUsedAt: Date, expiresAt: Date): Promise<void> {
    ensureModels();
    await CustomerSession.update({ lastUsedAt, expiresAt }, { where: { id } });
  },

  async revoke(id: string, at: Date): Promise<void> {
    ensureModels();
    await CustomerSession.update(
      { revokedAt: at },
      { where: { id, revokedAt: null } },
    );
  },

  async revokeByTokenHash(tokenHash: string, at: Date): Promise<void> {
    ensureModels();
    await CustomerSession.update(
      { revokedAt: at },
      { where: { tokenHash, revokedAt: null } },
    );
  },

  /** Signs the customer out everywhere, optionally keeping the current browser. */
  async revokeAllForCustomer(
    customerId: string,
    at: Date,
    exceptSessionId?: string,
    tx?: Tx,
  ): Promise<void> {
    ensureModels();
    await CustomerSession.update(
      { revokedAt: at },
      {
        where: {
          customerId,
          revokedAt: null,
          ...(exceptSessionId ? { id: { [Op.ne]: exceptSessionId } } : {}),
        },
        transaction: tx,
      },
    );
  },

  /** Housekeeping: removes sessions that can never be used again. Returns how many. */
  async deleteExpired(now: Date, absoluteCutoff: Date): Promise<number> {
    ensureModels();
    return CustomerSession.destroy({
      where: {
        [Op.or]: [
          { expiresAt: { [Op.lte]: now } },
          { createdAt: { [Op.lte]: absoluteCutoff } },
          { revokedAt: { [Op.ne]: null } },
        ],
      },
    });
  },
};
