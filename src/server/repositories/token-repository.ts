import "server-only";

import { Op } from "sequelize";

import {
  CustomerToken,
  ensureModels,
  type CustomerTokenType,
} from "@/server/db/models";
import { withTransaction, type Tx } from "@/server/db/transaction";

export interface TokenRecord {
  id: string;
  customerId: string;
  type: CustomerTokenType;
  expiresAt: Date;
}

export const tokenRepository = {
  /**
   * Stores a new link for the customer and cancels their older unused ones of
   * the same kind, so only the newest email works.
   */
  async replace(input: {
    customerId: string;
    type: CustomerTokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    ensureModels();
    await withTransaction(async (transaction) => {
      await CustomerToken.destroy({
        where: {
          customerId: input.customerId,
          type: input.type,
          usedAt: null,
        },
        transaction,
      });
      await CustomerToken.create(
        {
          customerId: input.customerId,
          type: input.type,
          tokenHash: input.tokenHash,
          createdAt: new Date(),
          expiresAt: input.expiresAt,
        },
        { transaction },
      );
    });
  },

  /**
   * Finds an unused, unexpired token and locks its row until the transaction
   * ends, so two requests with the same link cannot both succeed.
   */
  async findUsableForUpdate(
    tokenHash: string,
    type: CustomerTokenType,
    now: Date,
    tx: Tx,
  ): Promise<TokenRecord | null> {
    ensureModels();
    const model = await CustomerToken.findOne({
      where: {
        tokenHash,
        type,
        usedAt: null,
        expiresAt: { [Op.gt]: now },
      },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    return model
      ? {
          id: model.id,
          customerId: model.customerId,
          type: model.type,
          expiresAt: model.expiresAt,
        }
      : null;
  },

  async markUsed(id: string, at: Date, tx: Tx): Promise<void> {
    ensureModels();
    await CustomerToken.update(
      { usedAt: at },
      { where: { id }, transaction: tx },
    );
  },

  /** Cancels every unused link of a kind, e.g. after the password changed another way. */
  async cancelUnused(
    customerId: string,
    type: CustomerTokenType,
    tx: Tx,
  ): Promise<void> {
    ensureModels();
    await CustomerToken.destroy({
      where: { customerId, type, usedAt: null },
      transaction: tx,
    });
  },

  /** Removes every link of a customer, of any kind (used when the account is deleted). */
  async deleteAllForCustomer(customerId: string, tx: Tx): Promise<void> {
    ensureModels();
    await CustomerToken.destroy({ where: { customerId }, transaction: tx });
  },

  /** Housekeeping: removes links that can never be used again. Returns how many. */
  async deleteExpired(now: Date): Promise<number> {
    ensureModels();
    return CustomerToken.destroy({
      where: {
        [Op.or]: [
          { expiresAt: { [Op.lte]: now } },
          { usedAt: { [Op.ne]: null } },
        ],
      },
    });
  },
};
