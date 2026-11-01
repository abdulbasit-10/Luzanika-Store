import type { AddressRecord } from "@/server/repositories/address-repository";

/** A saved address as the website sees it. */
export type AddressDto = AddressRecord;

export function toAddressDto(address: AddressRecord): AddressDto {
  return {
    id: address.id,
    fullName: address.fullName,
    phone: address.phone,
    country: address.country,
    city: address.city,
    address: address.address,
    zip: address.zip,
    isDefault: address.isDefault,
  };
}

export function toAddressList(items: AddressRecord[]) {
  return { items: items.map(toAddressDto) };
}
