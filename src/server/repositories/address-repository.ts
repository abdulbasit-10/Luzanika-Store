import "server-only";

import { Customer, Address, ensureModels } from "@/server/db/models";
import type { Tx } from "@/server/db/transaction";

export interface AddressRecord {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  zip: string;
  isDefault: boolean;
}

export type AddressFields = Omit<AddressRecord, "id" | "isDefault">;

function toRecord(model: Address): AddressRecord {
  return {
    id: model.id,
    fullName: model.fullName,
    phone: model.phone,
    country: model.country,
    city: model.city,
    address: model.address,
    zip: model.zip,
    isDefault: model.isDefault,
  };
}

/** Every method works inside the caller's transaction, so the service can change several rows as one step. */
export const addressRepository = {
  /**
   * Makes other requests for the same customer wait their turn. Without it,
   * two requests at the same moment could both decide "I am the first address".
   */
  async lockCustomer(customerId: string, tx: Tx): Promise<void> {
    ensureModels();
    await Customer.findByPk(customerId, {
      transaction: tx,
      lock: tx.LOCK.UPDATE,
      attributes: ["id"],
    });
  },

  async list(customerId: string, tx: Tx): Promise<AddressRecord[]> {
    ensureModels();
    const rows = await Address.findAll({
      where: { customerId },
      order: [
        ["createdAt", "ASC"],
        ["id", "ASC"],
      ],
      transaction: tx,
    });
    return rows.map(toRecord);
  },

  async findOwned(
    customerId: string,
    id: string,
    tx: Tx,
  ): Promise<AddressRecord | null> {
    ensureModels();
    const row = await Address.findOne({
      where: { id, customerId },
      transaction: tx,
    });
    return row ? toRecord(row) : null;
  },

  async count(customerId: string, tx: Tx): Promise<number> {
    ensureModels();
    return Address.count({ where: { customerId }, transaction: tx });
  },

  async create(
    customerId: string,
    fields: AddressFields,
    isDefault: boolean,
    tx: Tx,
  ): Promise<AddressRecord> {
    ensureModels();
    const row = await Address.create(
      { customerId, ...fields, isDefault },
      { transaction: tx },
    );
    return toRecord(row);
  },

  async update(
    customerId: string,
    id: string,
    changes: Partial<AddressFields>,
    tx: Tx,
  ): Promise<void> {
    ensureModels();
    await Address.update(changes, {
      where: { id, customerId },
      transaction: tx,
    });
  },

  async clearDefault(customerId: string, tx: Tx): Promise<void> {
    ensureModels();
    await Address.update(
      { isDefault: false },
      { where: { customerId, isDefault: true }, transaction: tx },
    );
  },

  async markDefault(customerId: string, id: string, tx: Tx): Promise<void> {
    ensureModels();
    await Address.update(
      { isDefault: true },
      { where: { id, customerId }, transaction: tx },
    );
  },

  async delete(customerId: string, id: string, tx: Tx): Promise<void> {
    ensureModels();
    await Address.destroy({ where: { id, customerId }, transaction: tx });
  },

  /** Removes the whole address book (used when the account is deleted: addresses are personal data). */
  async deleteAllForCustomer(customerId: string, tx: Tx): Promise<void> {
    ensureModels();
    await Address.destroy({ where: { customerId }, transaction: tx });
  },
};
