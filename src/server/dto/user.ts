import type { CustomerRecord } from "@/server/repositories/customer-repository";

/** The customer as the website sees it. Never includes the password hash or internal fields. */
export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  language?: string;
  avatarUrl?: string;
}

/** Where the signed-in customer's own photo is served. The ?v= value only changes when the photo does, so browsers cache it safely. */
export function avatarUrlFor(avatarKey: string): string {
  const version = /([0-9a-f]{12})[0-9a-f]*\.webp$/.exec(avatarKey)?.[1] ?? "0";
  return `/api/v1/account/avatar?v=${version}`;
}

export function toUserDto(customer: CustomerRecord): UserDto {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    emailVerified: customer.emailVerifiedAt !== null,
    ...(customer.phone ? { phone: customer.phone } : {}),
    ...(customer.gender ? { gender: customer.gender } : {}),
    ...(customer.dateOfBirth ? { dateOfBirth: customer.dateOfBirth } : {}),
    language: customer.language,
    ...(customer.avatarKey
      ? { avatarUrl: avatarUrlFor(customer.avatarKey) }
      : {}),
  };
}
