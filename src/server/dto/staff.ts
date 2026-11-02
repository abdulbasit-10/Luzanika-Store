import type { StaffPrincipal } from "@/server/services/staff-auth-service";

/** The signed-in staff member as the admin sees them. Never includes the password hash or authenticator secret. */
export interface StaffProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
  twoFactorEnabled: boolean;
}

export function toStaffProfile(principal: StaffPrincipal): StaffProfileDto {
  const { staff } = principal;
  return {
    id: staff.id,
    email: staff.email,
    firstName: staff.firstName,
    lastName: staff.lastName,
    isSuperAdmin: staff.isSuperAdmin,
    twoFactorEnabled: staff.totpEnabledAt !== null,
  };
}
