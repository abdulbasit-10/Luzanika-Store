import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";

export type StaffStatus = "invited" | "active" | "disabled";

export interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: StaffStatus;
  isSuperAdmin: boolean;
  roles: { id: string; name: string }[];
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  staffCount: number;
}

export interface PermissionInfo {
  name: string;
  description: string;
}

export interface StaffFilters {
  search?: string;
  status?: StaffStatus;
}

export async function fetchStaff(
  filters: StaffFilters,
): Promise<StaffMember[]> {
  const answer = await apiGet<{ items: StaffMember[] }>("/admin/staff", {
    params: {
      search: filters.search?.trim() || undefined,
      status: filters.status,
    },
  });
  return answer.items;
}

export interface InviteBody {
  email: string;
  firstName: string;
  lastName: string;
  roleIds: string[];
  isSuperAdmin: boolean;
}

/** Emails the person a link to choose their password. `inviteEmailSent` is false when the email failed. */
export const inviteStaff = (body: InviteBody) =>
  apiPost<{ staff: StaffMember; inviteEmailSent: boolean }>(
    "/admin/staff",
    body,
  );

export interface StaffChanges {
  firstName?: string;
  lastName?: string;
  status?: "active" | "disabled";
  isSuperAdmin?: boolean;
  roleIds?: string[];
}

export const updateStaff = (id: string, changes: StaffChanges) =>
  apiPatch<{ staff: StaffMember }>(
    `/admin/staff/${encodeURIComponent(id)}`,
    changes,
  );

export const resendInvite = (id: string) =>
  apiPost<{ staff: StaffMember; inviteEmailSent: boolean }>(
    `/admin/staff/${encodeURIComponent(id)}/resend-invite`,
  );

/** For a lost phone: removes the authenticator and recovery codes and signs the person out. */
export const resetTwoFactor = (id: string) =>
  apiPost<{ staff: StaffMember }>(
    `/admin/staff/${encodeURIComponent(id)}/reset-two-factor`,
  );

export async function fetchRoles(): Promise<Role[]> {
  const answer = await apiGet<{ items: Role[] }>("/admin/roles");
  return answer.items;
}

export async function fetchPermissions(): Promise<PermissionInfo[]> {
  const answer = await apiGet<{ items: PermissionInfo[] }>(
    "/admin/permissions",
  );
  return answer.items;
}

export interface RoleBody {
  name: string;
  description: string;
  permissions: string[];
}

export const createRole = (body: RoleBody) =>
  apiPost<{ role: Role }>("/admin/roles", body);

export const updateRole = (id: string, body: Partial<RoleBody>) =>
  apiPatch<{ role: Role }>(`/admin/roles/${encodeURIComponent(id)}`, body);

export const deleteRole = (id: string) =>
  apiDelete(`/admin/roles/${encodeURIComponent(id)}`);
