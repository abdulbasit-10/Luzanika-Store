import { withKnownErrors } from "@/features/auth/auth-service";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";

/** What the add/edit form collects. */
export interface AddressInput {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  zip: string;
  isDefault: boolean;
}

export interface SavedAddress extends AddressInput {
  id: string;
}

interface AddressList {
  items: SavedAddress[];
}

/*
 * The server owns the address book: it decides which address is the default
 * (the first one saved, or the one the customer picks) and what happens to
 * the default when it is deleted. Every call answers with the full, current
 * list so the page always shows what is really saved.
 */

/** GET /addresses */
export async function listAddresses(): Promise<SavedAddress[]> {
  const { items } = await withKnownErrors(() =>
    apiGet<AddressList>("/addresses"),
  );
  return items;
}

/** POST /addresses */
export async function createAddress(
  values: AddressInput,
): Promise<SavedAddress[]> {
  const { items } = await withKnownErrors(() =>
    apiPost<AddressList>("/addresses", values),
  );
  return items;
}

/** PATCH /addresses/:id */
export async function updateAddress(
  id: string,
  values: AddressInput,
): Promise<SavedAddress[]> {
  const { items } = await withKnownErrors(() =>
    apiPatch<AddressList>(`/addresses/${encodeURIComponent(id)}`, values),
  );
  return items;
}

/** DELETE /addresses/:id */
export async function deleteAddress(id: string): Promise<SavedAddress[]> {
  const { items } = await withKnownErrors(() =>
    apiDelete<AddressList>(`/addresses/${encodeURIComponent(id)}`),
  );
  return items;
}

/** PUT /addresses/:id/default */
export async function setDefaultAddress(id: string): Promise<SavedAddress[]> {
  const { items } = await withKnownErrors(() =>
    apiPut<AddressList>(`/addresses/${encodeURIComponent(id)}/default`),
  );
  return items;
}
