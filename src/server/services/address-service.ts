import "server-only";

import { withTransaction, type Tx } from "@/server/db/transaction";
import { ApiError } from "@/server/http/api-error";
import {
  addressRepository,
  type AddressFields,
  type AddressRecord,
} from "@/server/repositories/address-repository";
import {
  addressIdSchema,
  type CreateAddressBody,
  type UpdateAddressBody,
} from "@/server/validation/address-schemas";

export const MAX_ADDRESSES_PER_CUSTOMER = 20;

/** A malformed id and someone else's id both look like "not found", so ids cannot be probed. */
function notFound(): ApiError {
  return new ApiError("not_found");
}

function parseId(id: string): string {
  const parsed = addressIdSchema.safeParse(id);
  if (!parsed.success) throw notFound();
  return parsed.data;
}

/**
 * Runs `work` as one step with this customer's address book locked, then
 * returns the book as it is afterwards. The rule every change keeps: a
 * customer with at least one address has exactly one default.
 */
async function changeBook(
  customerId: string,
  work: (tx: Tx) => Promise<void>,
): Promise<AddressRecord[]> {
  return withTransaction(async (tx) => {
    await addressRepository.lockCustomer(customerId, tx);
    await work(tx);
    return addressRepository.list(customerId, tx);
  });
}

export async function listAddresses(
  customerId: string,
): Promise<AddressRecord[]> {
  return withTransaction((tx) => addressRepository.list(customerId, tx));
}

export async function createAddress(
  customerId: string,
  body: CreateAddressBody,
): Promise<{ address: AddressRecord; items: AddressRecord[] }> {
  let created: AddressRecord | undefined;

  const items = await changeBook(customerId, async (tx) => {
    const existing = await addressRepository.count(customerId, tx);
    if (existing >= MAX_ADDRESSES_PER_CUSTOMER) {
      throw new ApiError("unprocessable", {
        message: `You can save up to ${MAX_ADDRESSES_PER_CUSTOMER} addresses. Please delete one first.`,
      });
    }

    // The first address is always the default; later ones only when asked.
    const makeDefault = body.isDefault || existing === 0;
    if (makeDefault) await addressRepository.clearDefault(customerId, tx);

    const { isDefault, ...fields } = body;
    void isDefault;
    created = await addressRepository.create(
      customerId,
      fields as AddressFields,
      makeDefault,
      tx,
    );
  });

  return { address: items.find((item) => item.id === created?.id)!, items };
}

export async function updateAddress(
  customerId: string,
  rawId: string,
  body: UpdateAddressBody,
): Promise<{ address: AddressRecord; items: AddressRecord[] }> {
  const id = parseId(rawId);

  const items = await changeBook(customerId, async (tx) => {
    const current = await addressRepository.findOwned(customerId, id, tx);
    if (!current) throw notFound();

    const { isDefault, ...fields } = body;
    if (Object.keys(fields).length > 0) {
      await addressRepository.update(customerId, id, fields, tx);
    }
    // Ticking "default" moves the default here. Unticking it on the current
    // default changes nothing: there must always be one, and picking another
    // address is how you move it.
    if (isDefault === true && !current.isDefault) {
      await addressRepository.clearDefault(customerId, tx);
      await addressRepository.markDefault(customerId, id, tx);
    }
  });

  return { address: items.find((item) => item.id === id)!, items };
}

export async function setDefaultAddress(
  customerId: string,
  rawId: string,
): Promise<AddressRecord[]> {
  const id = parseId(rawId);

  return changeBook(customerId, async (tx) => {
    const current = await addressRepository.findOwned(customerId, id, tx);
    if (!current) throw notFound();
    if (current.isDefault) return;
    await addressRepository.clearDefault(customerId, tx);
    await addressRepository.markDefault(customerId, id, tx);
  });
}

export async function deleteAddress(
  customerId: string,
  rawId: string,
): Promise<AddressRecord[]> {
  const id = parseId(rawId);

  return changeBook(customerId, async (tx) => {
    const current = await addressRepository.findOwned(customerId, id, tx);
    if (!current) throw notFound();

    await addressRepository.delete(customerId, id, tx);

    // Deleting the default promotes the oldest remaining address.
    if (current.isDefault) {
      const [next] = await addressRepository.list(customerId, tx);
      if (next) await addressRepository.markDefault(customerId, next.id, tx);
    }
  });
}
